import { parseArgs } from 'node:util';
import { initializeApp, applicationDefault, deleteApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { resolveWedding } from './wedding-admin.js';
const { values } = parseArgs({ options: { project: { type: 'string' }, wedding: { type: 'string' }, title: { type: 'string' }, active: { type: 'boolean', default: false } } });
const site = await resolveWedding(values.project, values.wedding, { allowDemo: true });
if (process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Remova FIRESTORE_EMULATOR_HOST para criar um casamento real.');
const title = (values.title || site.heading).trim();
if (!title || title.length > 200) throw new Error('Informe um título com até 200 caracteres.');
const app = initializeApp({ credential: applicationDefault(), projectId: values.project });
try {
  const ref = getFirestore(app).collection('weddings').doc(values.wedding);
  try {
    await ref.create({ title, active: values.active, createdAt: FieldValue.serverTimestamp(), schemaVersion: 1 });
    console.log(`Casamento criado: ${values.wedding}. RSVP ${values.active ? 'ativo' : 'inativo'}.`);
  } catch (error) {
    if (error.code !== 6 && error.code !== 'already-exists') throw error;
    console.log('Casamento existente preservado; status e metadados não foram alterados.');
  }
} finally { await deleteApp(app); }
