import { readFileSync } from 'node:fs';
import { after, before, beforeEach, test } from 'node:test';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
let env;
const valid = () => ({ name: 'Ana Silva', attendance: 'yes', guests: 2, message: 'Parabéns!', createdAt: serverTimestamp() });
before(async () => { env = await initializeTestEnvironment({ projectId: 'demo-wedding', firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 } }); });
after(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'admins', 'authorized'), { enabled: true });
    await setDoc(doc(context.firestore(), 'rsvp_responses', 'existing'), valid());
  });
});
test('anônimo cria RSVP válido e ausência com zero pessoas', async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertSucceeds(setDoc(doc(db, 'rsvp_responses', 'yes'), valid()));
  await assertSucceeds(setDoc(doc(db, 'rsvp_responses', 'no'), { ...valid(), attendance: 'no', guests: 0 }));
});
test('anônimo e autenticado sem autorização não podem consultar, alterar ou excluir respostas', async () => {
  for (const context of [env.unauthenticatedContext(), env.authenticatedContext('other')]) {
    const db = context.firestore(); const ref = doc(db, 'rsvp_responses', 'existing');
    await assertFails(getDoc(ref)); await assertFails(getDocs(collection(db, 'rsvp_responses')));
    await assertFails(updateDoc(ref, { name: 'Outro' })); await assertFails(deleteDoc(ref));
  }
});
test('administrador autorizado consulta; alterações e exclusão continuam negadas', async () => {
  const db = env.authenticatedContext('authorized').firestore();
  await assertSucceeds(getDocs(collection(db, 'rsvp_responses')));
  await assertSucceeds(getDoc(doc(db, 'rsvp_responses', 'existing')));
  await assertFails(updateDoc(doc(db, 'rsvp_responses', 'existing'), { guests: 3 }));
  await assertFails(deleteDoc(doc(db, 'rsvp_responses', 'existing')));
});
test('nenhum cliente pode promover usuários ou listar administradores', async () => {
  for (const context of [env.unauthenticatedContext(), env.authenticatedContext('other'), env.authenticatedContext('authorized')]) {
    const db = context.firestore();
    await assertFails(setDoc(doc(db, 'admins', 'other'), {}));
    await assertFails(deleteDoc(doc(db, 'admins', 'authorized')));
    await assertFails(getDocs(collection(db, 'admins')));
  }
  await assertSucceeds(getDoc(doc(env.authenticatedContext('authorized').firestore(), 'admins', 'authorized')));
  await assertFails(getDoc(doc(env.authenticatedContext('other').firestore(), 'admins', 'authorized')));
});
for (const [label, fields] of Object.entries({
  'nome vazio': { name: '' }, 'nome em branco': { name: ' \t ' }, 'nome longo': { name: 'a'.repeat(121) }, 'nome tipo inválido': { name: 1 },
  'presença inválida': { attendance: 'sim' }, 'zero convidados': { guests: 0 }, 'convidados negativos': { guests: -1 },
  'convidados acima do limite': { guests: 11 }, 'convidados fracionários': { guests: 1.5 }, 'convidados string': { guests: '2' },
  'ausência com convidados': { attendance: 'no', guests: 2 }, 'mensagem longa': { message: 'a'.repeat(1001) },
  'mensagem tipo inválido': { message: [] }, 'campo extra': { role: 'admin' }, 'timestamp do cliente': { createdAt: Timestamp.fromMillis(0) },
})) test(`rejeita ${label}`, async () => {
  await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), 'rsvp_responses', 'invalid'), { ...valid(), ...fields }));
});
test('rejeita campos ausentes e outras coleções', async () => {
  const db = env.unauthenticatedContext().firestore();
  for (const key of Object.keys(valid())) { const data = valid(); delete data[key]; await assertFails(setDoc(doc(db, 'rsvp_responses', 'missing'), data)); }
  await assertFails(setDoc(doc(db, 'unknown', 'record'), valid()));
});
