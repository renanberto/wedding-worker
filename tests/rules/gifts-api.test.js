import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestoreStore } from '../../server/firestore.js';
import { giftService } from '../../server/gifts.js';
import { createMockUserToken } from '@firebase/util';
let env, store, service; const mails = [];
const projectId = 'demo-wedding';
before(async () => {
  env = await initializeTestEnvironment({ projectId, firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 } });
  await env.clearFirestore();
  store = firestoreStore({ projectId, endpoint: 'http://127.0.0.1:8080', token: async () => 'owner' });
  await store.transaction(async tx => {
    tx.set('weddings/gifts-test', { active: true });
    tx.set('weddings/gifts-test/services/gifts', { enabled: true });
    tx.set('weddings/gifts-test/members/admin', { enabled: true, role: 'owner' });
    tx.set('weddings/other/members/other', { enabled: true, role: 'owner' });
    tx.set('weddings/gifts-test/gifts/item', { title: 'Presente', description: '', url: '', imageUrl: '', archived: false, status: 'available', createdAt: new Date().toISOString() });
  });
  const scoped = firestoreStore({ projectId, endpoint: 'http://127.0.0.1:8080', token: async () => createMockUserToken({ sub: 'gift-service', giftServiceFor: 'gifts-test' }, projectId) });
  service = giftService({ store: scoped, weddingId: 'gifts-test', tokenSecret: 'test-secret-'.repeat(4), origin: 'https://wedding.test', authorize: async token => token, sendEmail: async mail => { mails.push(mail); } });
});
after(async () => { await env?.cleanup(); });
test('transações REST reais impedem reservas duplicadas sob concorrência', async () => {
  const requests = Array.from({ length: 5 }, (_, i) => service.reserve({ giftId: 'item', requestId: `request-${i}`, name: 'Convidado', email: `guest-${i}@example.test` }, `ip-${i}`));
  const results = await Promise.allSettled(requests);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1, JSON.stringify(results.map(r => r.status === 'fulfilled' ? 'ok' : { status: r.reason.status, message: r.reason.message })));
  assert.equal(mails.length, 1);
  const params = Object.fromEntries(new URLSearchParams(mails[0].url.split('?')[1]));
  assert.equal((await service.confirm(params)).status, 'confirmed');
  assert.equal((await service.list()).gifts[0].status, 'confirmed');
  await assert.rejects(service.adminList('other'), { status: 403 });
});
test('regras bloqueiam catálogo, reservas e limites privados no SDK cliente, inclusive para noivos', async () => {
  for (const context of [env.unauthenticatedContext(), env.authenticatedContext('admin'), env.authenticatedContext('other')]) {
    for (const collection of ['gifts', 'gift_reservations', 'gift_rate_limits']) {
      const ref = doc(context.firestore(), 'weddings', 'gifts-test', collection, 'item');
      await assertFails(getDoc(ref));
      await assertFails(setDoc(ref, { title: 'Ataque', email: 'private@example.test' }));
    }
  }
});

test('identidade de serviço só acessa presentes do próprio casamento e pode ser revogada', async () => {
  const db = env.authenticatedContext('gift-service', { giftServiceFor: 'gifts-test' }).firestore();
  await getDoc(doc(db,'weddings','gifts-test','gifts','item'));
  await setDoc(doc(db,'weddings','gifts-test','gift_rate_limits','probe'), { count:1 });
  await assertFails(getDoc(doc(db,'weddings','other','gifts','item')));
  await assertFails(getDoc(doc(db,'weddings','gifts-test','rsvp_responses','item')));
  await assertFails(setDoc(doc(db,'weddings','gifts-test','members','intruder'), {enabled:true,role:'owner'}));
  await assertFails(setDoc(doc(db,'weddings','gifts-test'), {active:false}));
  await store.transaction(async tx => { tx.set('weddings/gifts-test/services/gifts', { enabled:false }); });
  await assertFails(getDoc(doc(db,'weddings','gifts-test','gifts','item')));
});
