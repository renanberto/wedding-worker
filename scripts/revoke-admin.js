import { parseArgs } from 'node:util';
import { initializeApp, applicationDefault, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { resolveWedding } from './wedding-admin.js';
const { values } = parseArgs({ options: { project: { type: 'string' }, uid: { type: 'string' }, wedding: { type: 'string' }, 'disable-account': { type: 'boolean', default: false } } });
if (!values.uid || values.uid.includes('/')) throw new Error('Informe --uid válido.');
await resolveWedding(values.project, values.wedding);
if (process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Remova variáveis de emulador antes de revogar acesso real.');
const app = initializeApp({ credential: applicationDefault(), projectId: values.project });
try {
  await getFirestore(app).collection('weddings').doc(values.wedding).collection('members').doc(values.uid).delete();
  if (values['disable-account']) {
    await getAuth(app).updateUser(values.uid, { disabled: true });
    await getAuth(app).revokeRefreshTokens(values.uid);
  }
  console.log(`Acesso removido somente do casamento ${values.wedding}.${values['disable-account'] ? ' Conta global desabilitada por opção explícita.' : ' A conta e os demais casamentos foram preservados.'}`);
} finally { await deleteApp(app); }
