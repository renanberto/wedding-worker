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
    await setDoc(doc(context.firestore(), 'weddings', 'alpha'), { active: true });
    await setDoc(doc(context.firestore(), 'weddings', 'beta'), { active: true });
    await setDoc(doc(context.firestore(), 'weddings', 'closed'), { active: false });
    await setDoc(doc(context.firestore(), 'weddings', 'beta', 'members', 'beta-admin'), { enabled: true, role: 'owner' });
    await setDoc(doc(context.firestore(), 'admins', 'legacy'), {});
    await setDoc(doc(context.firestore(), 'weddings', 'alpha', 'members', 'authorized'), { enabled: true, role: 'admin' });
    await setDoc(doc(context.firestore(), 'weddings', 'alpha', 'rsvp_responses', 'existing'), valid());
  });
});
test('anônimo cria RSVP válido e ausência com zero pessoas', async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertSucceeds(setDoc(doc(db, 'weddings', 'alpha', 'rsvp_responses', 'yes'), valid()));
  await assertSucceeds(setDoc(doc(db, 'weddings', 'alpha', 'rsvp_responses', 'no'), { ...valid(), attendance: 'no', guests: 0 }));
});
test('anônimo e autenticado sem autorização não podem consultar, alterar ou excluir respostas', async () => {
  for (const context of [env.unauthenticatedContext(), env.authenticatedContext('other')]) {
    const db = context.firestore(); const ref = doc(db, 'weddings', 'alpha', 'rsvp_responses', 'existing');
    await assertFails(getDoc(ref)); await assertFails(getDocs(collection(db, 'weddings', 'alpha', 'rsvp_responses')));
    await assertFails(updateDoc(ref, { name: 'Outro' })); await assertFails(deleteDoc(ref));
  }
});
test('administrador autorizado consulta; alterações e exclusão continuam negadas', async () => {
  const db = env.authenticatedContext('authorized').firestore();
  await assertSucceeds(getDocs(collection(db, 'weddings', 'alpha', 'rsvp_responses')));
  await assertSucceeds(getDoc(doc(db, 'weddings', 'alpha', 'rsvp_responses', 'existing')));
  await assertFails(updateDoc(doc(db, 'weddings', 'alpha', 'rsvp_responses', 'existing'), { guests: 3 }));
  await assertFails(deleteDoc(doc(db, 'weddings', 'alpha', 'rsvp_responses', 'existing')));
});
test('nenhum cliente pode promover usuários ou listar administradores', async () => {
  for (const context of [env.unauthenticatedContext(), env.authenticatedContext('other'), env.authenticatedContext('authorized')]) {
    const db = context.firestore();
    await assertFails(setDoc(doc(db, 'weddings', 'alpha', 'members', 'other'), {}));
    await assertFails(deleteDoc(doc(db, 'weddings', 'alpha', 'members', 'authorized')));
    await assertFails(getDocs(collection(db, 'weddings', 'alpha', 'members')));
  }
  await assertSucceeds(getDoc(doc(env.authenticatedContext('authorized').firestore(), 'weddings', 'alpha', 'members', 'authorized')));
  await assertFails(getDoc(doc(env.authenticatedContext('other').firestore(), 'weddings', 'alpha', 'members', 'authorized')));
});
for (const [label, fields] of Object.entries({
  'nome vazio': { name: '' }, 'nome em branco': { name: ' \t ' }, 'nome longo': { name: 'a'.repeat(121) }, 'nome tipo inválido': { name: 1 },
  'presença inválida': { attendance: 'sim' }, 'zero convidados': { guests: 0 }, 'convidados negativos': { guests: -1 },
  'convidados acima do limite': { guests: 11 }, 'convidados fracionários': { guests: 1.5 }, 'convidados string': { guests: '2' },
  'ausência com convidados': { attendance: 'no', guests: 2 }, 'mensagem longa': { message: 'a'.repeat(1001) },
  'mensagem tipo inválido': { message: [] }, 'campo extra': { role: 'admin' }, 'timestamp do cliente': { createdAt: Timestamp.fromMillis(0) },
})) test(`rejeita ${label}`, async () => {
  await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), 'weddings', 'alpha', 'rsvp_responses', 'invalid'), { ...valid(), ...fields }));
});
test('rejeita campos ausentes e outras coleções', async () => {
  const db = env.unauthenticatedContext().firestore();
  for (const key of Object.keys(valid())) { const data = valid(); delete data[key]; await assertFails(setDoc(doc(db, 'weddings', 'alpha', 'rsvp_responses', 'missing'), data)); }
  await assertFails(setDoc(doc(db, 'unknown', 'record'), valid()));
});

test('membro de outro casamento e administrador legado não herdam acesso', async () => {
  for (const uid of ['beta-admin', 'legacy']) {
    const db = env.authenticatedContext(uid).firestore();
    await assertFails(getDocs(collection(db, 'weddings', 'alpha', 'rsvp_responses')));
    await assertFails(getDoc(doc(db, 'weddings', 'alpha', 'rsvp_responses', 'existing')));
  }
  await assertSucceeds(getDocs(collection(env.authenticatedContext('beta-admin').firestore(), 'weddings', 'beta', 'rsvp_responses')));
});
test('somente casamentos ativos recebem respostas e raiz legada é bloqueada', async () => {
  const db = env.unauthenticatedContext().firestore();
  for (const id of ['closed', 'missing']) await assertFails(setDoc(doc(db, 'weddings', id, 'rsvp_responses', 'new'), valid()));
  await assertFails(setDoc(doc(db, 'rsvp_responses', 'new'), valid()));
  await assertFails(setDoc(doc(db, 'weddings', 'alpha', 'rsvp_responses', 'new'), { ...valid(), weddingId: 'beta' }));
});
test('permissões desabilitadas ou inválidas e revogação por casamento', async () => {
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    for (const [uid, data] of Object.entries({ disabled: {enabled:false,role:'admin'}, invalid:{enabled:true,role:'guest'}, both:{enabled:true,role:'owner'} }))
      await setDoc(doc(db, 'weddings', 'alpha', 'members', uid), data);
    await setDoc(doc(db, 'weddings', 'beta', 'members', 'both'), {enabled:true,role:'admin'});
  });
  for (const uid of ['disabled','invalid']) await assertFails(getDocs(collection(env.authenticatedContext(uid).firestore(), 'weddings','alpha','rsvp_responses')));
  const db = env.authenticatedContext('both').firestore();
  await assertSucceeds(getDocs(collection(db,'weddings','alpha','rsvp_responses')));
  await env.withSecurityRulesDisabled(c => deleteDoc(doc(c.firestore(),'weddings','alpha','members','both')));
  await assertFails(getDocs(collection(db,'weddings','alpha','rsvp_responses')));
  await assertSucceeds(getDocs(collection(db,'weddings','beta','rsvp_responses')));
});
test('clientes não alteram casamentos nem listam cadastro global', async () => {
  const db = env.authenticatedContext('authorized').firestore();
  await assertFails(getDocs(collection(db,'weddings')));
  await assertFails(updateDoc(doc(db,'weddings','alpha'), {active:false}));
  await assertFails(setDoc(doc(db,'weddings','new'), {active:true}));
  await assertFails(deleteDoc(doc(db,'weddings','alpha')));
  await assertFails(getDoc(doc(db,'admins','legacy')));
});
