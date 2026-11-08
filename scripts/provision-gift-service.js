import { parseArgs } from 'node:util';
import { spawn } from 'node:child_process';
import { initializeApp, applicationDefault, cert, deleteApp } from 'firebase-admin/app';
import { readFile } from 'node:fs/promises';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { randomBytes } from 'node:crypto';
import { loadEnv } from 'vite';
import { resolveWedding } from './wedding-admin.js';

const { values } = parseArgs({ options: { project: { type: 'string' }, wedding: { type: 'string' }, apply: { type: 'boolean' } } });
const site = await resolveWedding(values.project, values.wedding);
if (!values.apply) { console.log(`Simulação: criar identidade de presentes para ${values.wedding} e salvar credenciais no ambiente GitHub site-${site.id}. Use --apply.`); process.exit(0); }
if (process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Remova variáveis de emulador.');
const env = loadEnv('development', new URL(`../sites/${site.id}/`, import.meta.url).pathname, 'VITE_');
if (env.VITE_FIREBASE_PROJECT_ID !== values.project || !env.VITE_FIREBASE_API_KEY) throw new Error('Configure .env.local com o Firebase compartilhado correto.');
async function secret(name, value) {
  await new Promise((resolve, reject) => {
    const child = spawn('gh', ['secret', 'set', name, '--repo', 'renanberto/wedding-worker', '--env', `site-${site.id}`], { stdio: ['pipe', 'ignore', 'ignore'] });
    child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error('Não foi possível salvar o segredo no ambiente GitHub.')));
    child.stdin.on('error', () => {}); child.stdin.end(value);
  });
}
const credential = process.env.GOOGLE_APPLICATION_CREDENTIALS ? cert(JSON.parse(await readFile(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'))) : applicationDefault();
const app = initializeApp({ credential, projectId: values.project });
let phase = 'verificar identidade';
try {
  const auth = getAuth(app); const uid = `gift-service-${values.wedding}`;
  let user;
  try { user = await auth.getUser(uid); } catch (e) { if (e.code !== 'auth/user-not-found') throw e; }
  if (user && (user.email || user.customClaims?.giftServiceFor !== values.wedding || user.disabled)) throw new Error('O UID de serviço já está ocupado ou desabilitado. Revise antes de continuar.');
  if (!user) { await auth.createUser({ uid, displayName: `Gift API ${values.wedding}` }); await auth.setCustomUserClaims(uid, { giftServiceFor: values.wedding }); }
  phase = 'assinar token localmente';
  const customToken = await auth.createCustomToken(uid);
  phase = 'emitir sessão de serviço';
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(env.VITE_FIREBASE_API_KEY)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: customToken, returnSecureToken: true }), signal: AbortSignal.timeout(15000) });
  const tokens = await response.json();
  if (!response.ok || !tokens.refreshToken) throw new Error('Não foi possível emitir a credencial de serviço.');
  phase = 'salvar segredos no GitHub';
  await secret('GIFTS_FIREBASE_REFRESH_TOKEN', tokens.refreshToken);
  // Rotacionar este segredo invalida solicitações idempotentes ainda pendentes.
  // Links já enviados continuam verificáveis pelo hash gravado na reserva.
  await secret('GIFTS_TOKEN_SECRET', randomBytes(32).toString('hex'));
  phase = 'registrar identidade no Firestore';
  const service = getFirestore(app).collection('weddings').doc(values.wedding).collection('services').doc('gifts');
  if (!(await service.get()).exists) await service.create({ enabled: true, uid, createdAt: FieldValue.serverTimestamp() });
  console.log(`Identidade restrita provisionada para ${values.wedding}. Segredos salvos no ambiente site-${site.id}, sem arquivos locais ou saída de credenciais. Cadastre RESEND_API_KEY e GIFTS_FROM_EMAIL para ativar as reservas.`);
} catch (error) {
  console.error(error.code ? `Falha ao ${phase} (${error.code}); revise permissões e reexecute.` : error.message);
  process.exitCode = 1;
} finally { await deleteApp(app); }
