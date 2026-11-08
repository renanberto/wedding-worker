import { parseArgs } from 'node:util';
import { initializeApp, applicationDefault, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readSites } from './site-config.js';
const { values } = parseArgs({ options: { project: { type: 'string' }, uid: { type: 'string' } } });
if (!values.uid || values.uid.includes('/') || !(await readSites()).some(s => s.firebaseProject === values.project && s.mode === 'firebase')) throw new Error('Informe --project cadastrado e --uid válido.');
if (process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Remova variáveis de emulador antes de revogar acesso real.');
const app = initializeApp({ credential: applicationDefault(), projectId: values.project });
try {
  await getFirestore(app).collection('admins').doc(values.uid).delete();
  await getAuth(app).updateUser(values.uid, { disabled: true });
  await getAuth(app).revokeRefreshTokens(values.uid);
  console.log('Autorização removida, conta desabilitada e renovação das sessões revogada.');
} finally { await deleteApp(app); }
