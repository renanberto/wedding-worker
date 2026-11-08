import { parseArgs, isDeepStrictEqual } from 'node:util';
import { writeFile, realpath } from 'node:fs/promises';
import { resolve, relative, dirname, basename, sep, isAbsolute } from 'node:path';
import { initializeApp, applicationDefault, deleteApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { resolveWedding } from './wedding-admin.js';

const { values } = parseArgs({ options: {
  project: { type: 'string' }, wedding: { type: 'string' }, backup: { type: 'string' },
  apply: { type: 'boolean', default: false }, help: { type: 'boolean' },
} });
if (values.help) {
  console.log('node scripts/migrate-legacy.js --project ID --wedding ID [--apply --backup /pasta/privada/arquivo.json]');
  process.exit(0);
}
const site = await resolveWedding(values.project, values.wedding);
// O legado pertence exclusivamente ao casamento original. Nunca importá-lo em outro evento.
if (site.id !== 'test') throw new Error('O legado pertence ao casamento original test.');
if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Remova as variáveis dos emuladores.');
if (values.apply && !values.backup) throw new Error('--apply exige --backup fora do repositório.');
const app = initializeApp({ credential: applicationDefault(), projectId: values.project });
try {
  const db = getFirestore(app);
  const [responses, admins] = await Promise.all([db.collection('rsvp_responses').get(), db.collection('admins').get()]);
  if (values.apply) {
    const repository = await realpath(new URL('../', import.meta.url));
    const file = resolve(await realpath(dirname(resolve(values.backup))), basename(values.backup));
    const destination = relative(repository, file);
    if (!destination || (!isAbsolute(destination) && destination !== '..' && !destination.startsWith('..' + sep))) throw new Error('Backup deve ficar fora do repositório.');
    await writeFile(file, JSON.stringify({ schema: 'legacy-migration-v1', projectId: values.project, weddingId: values.wedding,
      exportedAt: new Date().toISOString(), responses: responses.docs.map(d => ({ id: d.id, data: d.data() })),
      admins: admins.docs.map(d => ({ id: d.id, data: d.data() })),
    }), { flag: 'wx', mode: 0o600 });
  }
  const wedding = db.collection('weddings').doc(values.wedding);
  const work = [];
  for (const response of responses.docs) {
    const ref = wedding.collection('rsvp_responses').doc(response.id);
    const existing = await ref.get();
    if (existing.exists && !isDeepStrictEqual(existing.data(), response.data())) throw new Error('Conflito entre resposta legada e destino; nada será sobrescrito.');
    if (!existing.exists) work.push(() => ref.create(response.data()));
  }
  for (const admin of admins.docs) {
    const user = await getAuth(app).getUser(admin.id);
    const ref = wedding.collection('members').doc(admin.id);
    if (!(await ref.get()).exists) work.push(() => ref.create({ ...admin.data(), role: 'admin', enabled: !user.disabled }));
  }
  if (values.apply) {
    if (!(await wedding.get()).exists) await wedding.create({ title: site.heading, active: true, schemaVersion: 1, createdAt: FieldValue.serverTimestamp() });
    for (const action of work) await action();
  }
  console.log(`${values.apply ? 'Migração aplicada' : 'Simulação'}: ${responses.size} respostas, ${admins.size} administradores; ${work.length} documentos ${values.apply ? 'copiados' : 'pendentes'}. IDs, timestamps e contas preservados. Legado mantido para recuperação.`);
} finally { await deleteApp(app); }
