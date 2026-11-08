import { parseArgs } from 'node:util';
import { readFile, writeFile, realpath } from 'node:fs/promises';
import { resolve, relative, dirname, basename, sep, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
import { initializeApp, applicationDefault, deleteApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { validateRsvp } from '../packages/wedding-core/src/lib/rsvp.js';
import { readSites } from './site-config.js';
const { values, positionals } = parseArgs({ allowPositionals: true, options: { project: { type: 'string' }, out: { type: 'string' }, file: { type: 'string' }, apply: { type: 'boolean' }, help: { type: 'boolean' } } });
if (values.help) {
  console.log('backup --project ID --out /caminho/privado/backup.json | restore --project ID --file /caminho/privado/backup.json [--apply]');
  process.exit(0);
}
const operation = positionals[0];
const project = values.project;
if (!['backup', 'restore'].includes(operation) || !project || !(await readSites()).some(s => s.mode === 'firebase' && s.firebaseProject === project)) throw new Error('Escolha backup/restore e um projeto Firebase cadastrado em sites.json.');
if (process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Remova FIRESTORE_EMULATOR_HOST antes de operar dados reais.');
const file = resolve(values.out || values.file || '');
if (!(operation === 'backup' ? values.out : values.file)) throw new Error('Informe --out ou --file.');
const repository = await realpath(new URL('../', import.meta.url));
const canonical = operation === 'backup' ? resolve(await realpath(dirname(file)), basename(file)) : await realpath(file);
const destination = relative(repository, canonical);
if (!destination || (!isAbsolute(destination) && destination !== '..' && !destination.startsWith('..' + sep))) throw new Error('Guarde dados de convidados fora do repositório.');
const checksum = rows => createHash('sha256').update(JSON.stringify(rows)).digest('hex');
let snapshot;
if (operation === 'restore') {
  snapshot = JSON.parse(await readFile(file, 'utf8'));
  if (snapshot.schema !== 1 || snapshot.projectId !== project || !Array.isArray(snapshot.responses) || snapshot.checksum !== checksum(snapshot.responses)) throw new Error('Backup inválido, corrompido ou de outro projeto.');
  const ids = new Set();
  for (const row of snapshot.responses) {
    if (!/^[A-Za-z0-9_-]{1,1500}$/.test(row.id) || ids.has(row.id) || !Number.isInteger(row.data?.createdAt?.seconds) || !Number.isInteger(row.data?.createdAt?.nanoseconds)) throw new Error('Documento inválido no backup.');
    ids.add(row.id); validateRsvp(row.data); new Timestamp(row.data.createdAt.seconds, row.data.createdAt.nanoseconds);
  }
  console.log(`Backup validado: ${snapshot.responses.length} respostas do projeto ${project}.`);
  if (!values.apply) { console.log('Simulação concluída. --apply restaura apenas documentos ausentes, sem sobrescrever respostas ou permissões.'); process.exit(0); }
}
const app = initializeApp({ credential: applicationDefault(), projectId: project });
try {
  const db = getFirestore(app);
  if (operation === 'backup') {
    const responses = await db.collection('rsvp_responses').get();
    const rows = responses.docs.map(doc => { const data = doc.data(); return { id: doc.id, data: { ...data, createdAt: { seconds: data.createdAt.seconds, nanoseconds: data.createdAt.nanoseconds } } }; });
    const bundle = { schema: 1, projectId: project, exportedAt: new Date().toISOString(), responses: rows, checksum: checksum(rows) };
    await writeFile(file, JSON.stringify(bundle), { flag: 'wx', mode: 0o600 });
    console.log(`Backup criado: ${rows.length} respostas. Arquivo privado: ${file}`);
  } else {
    let created = 0, preserved = 0;
    for (const row of snapshot.responses) {
      try { await db.collection('rsvp_responses').doc(row.id).create({ ...validateRsvp(row.data), createdAt: new Timestamp(row.data.createdAt.seconds, row.data.createdAt.nanoseconds) }); created++; }
      catch (error) { if (error.code === 6 || error.code === 'already-exists') preserved++; else throw error; }
    }
    console.log(`Restauração: ${created} criados; ${preserved} documentos existentes preservados. Contas e administradores não foram alterados.`);
  }
} finally { await deleteApp(app); }
