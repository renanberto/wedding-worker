// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { giftService } from '../server/gifts.js';
import { createWorker } from '../server/worker.js';
import { validateGift } from '../packages/wedding-core/src/lib/gifts.js';
let store, service, mail, clock;
afterEach(() => vi.unstubAllGlobals());
const giftPath = 'weddings/alpha/gifts/item';
function memoryStore() {
  const data = new Map(); let queue = Promise.resolve();
  const get = async key => structuredClone(data.get(key) || null);
  return { data, get, list: async path => [...data].filter(([key]) => key.startsWith(path + '/') && key.split('/').length === path.split('/').length + 1).map(([key, value]) => ({ ...structuredClone(value), id: key.split('/').pop() })),
    transaction(fn) {
      const run = queue.then(async () => { const staged = []; const result = await fn({ get, set: (path, row) => staged.push([path, structuredClone(row)]) }); staged.forEach(([path, row]) => data.set(path, row)); return result; });
      queue = run.catch(() => {}); return run;
    },
  };
}
const input = (requestId = 'request-one') => ({ giftId: 'item', requestId, name: 'Ana', email: 'ana@example.test' });
function linkInput(index = 0) { const params = new URLSearchParams(mail.mock.calls[index][0].url.split('?')[1]); return Object.fromEntries(params); }
beforeEach(() => {
  clock = Date.now(); store = memoryStore(); mail = vi.fn().mockResolvedValue({});
  store.data.set('weddings/alpha', { active: true });
  store.data.set('weddings/alpha/members/admin', { role: 'owner', enabled: true });
  store.data.set('weddings/beta/members/other', { role: 'admin', enabled: true });
  store.data.set(giftPath, { title: 'Cafeteira', description: '', url: '', imageUrl: '', status: 'available', archived: false, createdAt: new Date(clock).toISOString() });
  service = giftService({ store, weddingId: 'alpha', tokenSecret: 'test-secret-'.repeat(4), origin: 'https://alpha.example.test', authorize: async token => token, sendEmail: mail, now: () => clock });
});
it('confirma somente após o POST com token correto e preserva a idempotência', async () => {
  await service.reserve(input(), 'ip');
  expect((await service.list()).gifts[0].status).toBe('pending');
  const fields = linkInput();
  await expect(service.confirm({ ...fields, token: 'a'.repeat(64) })).rejects.toMatchObject({ status: 400 });
  await expect(service.confirm(fields)).resolves.toEqual({ status: 'confirmed', title: 'Cafeteira' });
  await expect(service.confirm(fields)).resolves.toHaveProperty('status', 'confirmed');
  await expect(service.reserve(input('second'), 'ip')).rejects.toMatchObject({ status: 409 });
});
it('duas escolhas concorrentes não reservam o mesmo presente', async () => {
  const results = await Promise.allSettled([service.reserve(input(), 'ip1'), service.reserve({ ...input('two'), email: 'other@example.test' }, 'ip2')]);
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  expect(mail).toHaveBeenCalledTimes(1);
});
it('expiração libera o presente e um link antigo não toma uma nova reserva', async () => {
  await service.reserve(input(), 'ip'); const previous = linkInput();
  clock += 31 * 60000;
  expect((await service.list()).gifts[0].status).toBe('available');
  await expect(service.confirm(previous)).rejects.toMatchObject({ status: 410 });
  await service.reserve(input('two'), 'ip');
  await expect(service.confirm(previous)).rejects.toMatchObject({ status: 410 });
  await expect(service.confirm(linkInput(1))).resolves.toHaveProperty('status', 'confirmed');
});
it('falha de envio libera o presente e invalida o link', async () => {
  mail.mockRejectedValueOnce(new Error('provider credentials should not leak'));
  await expect(service.reserve(input(), 'ip')).rejects.toMatchObject({ status: 503 });
  expect((await service.list()).gifts[0].status).toBe('available');
  await expect(service.confirm(linkInput())).rejects.toMatchObject({ status: 410 });
});
it('requisição repetida usa a mesma chave de envio, sem consumir outro limite', async () => {
  await service.reserve(input(), 'ip'); await service.reserve(input(), 'ip');
  expect(mail.mock.calls[0][0].idempotencyKey).toBe(mail.mock.calls[1][0].idempotencyKey);
  expect([...store.data].filter(([k]) => k.includes('gift_reservations'))).toHaveLength(1);
});
it('nome, e-mail, identificador de reserva e token não entram no catálogo público', async () => {
  await service.reserve(input(), 'ip');
  const publicData = JSON.stringify(await service.list());
  for (const secret of ['ana@example.test', 'tokenHash', 'reservationId', linkInput().token]) expect(publicData).not.toContain(secret);
  expect((await service.adminList('admin')).reservations[0]).toMatchObject({ name: 'Ana', email: 'ana@example.test' });
});
it('administrador de outro casamento não lê ou modifica os presentes', async () => {
  for (const uid of ['other', null]) {
    await expect(service.adminList(uid)).rejects.toMatchObject({ status: 403 });
    await expect(service.edit(uid, { action: 'save', title: 'Ataque' })).rejects.toMatchObject({ status: 403 });
  }
  store.data.set('weddings/alpha/members/admin', { role: 'owner', enabled: false });
  await expect(service.adminList('admin')).rejects.toMatchObject({ status: 403 });
});
it('liberação administrativa cancela o link; reserva ativa impede edição', async () => {
  await service.reserve(input(), 'ip');
  await expect(service.edit('admin', { id: 'item', action: 'save', title: 'Outro' })).rejects.toMatchObject({ status: 409 });
  await service.edit('admin', { id: 'item', action: 'release' });
  await expect(service.confirm(linkInput())).rejects.toMatchObject({ status: 410 });
  await service.edit('admin', { id: 'item', action: 'archive' });
  expect((await service.list()).gifts).toHaveLength(0);
});
it('limita envios por destinatário e nunca armazena IP em texto', async () => {
  for (let i = 0; i < 3; i++) { await service.reserve(input(`try-${i}`), 'sensitive-ip'); await service.edit('admin', { id: 'item', action: 'release' }); }
  await expect(service.reserve(input('blocked'), 'different-ip')).rejects.toMatchObject({ status: 429 });
  expect(JSON.stringify([...store.data])).not.toContain('sensitive-ip');
});
it('casamento encerrado não recebe ou confirma reservas; ausência de e-mail desabilita escolhas', async () => {
  await service.reserve(input(), 'ip'); store.data.set('weddings/alpha', { active: false });
  await expect(service.confirm(linkInput())).rejects.toMatchObject({ status: 410 });
  expect((await service.list()).gifts).toHaveLength(0);
  const disabled = giftService({ store, weddingId: 'alpha', origin: 'https://alpha.example.test', authorize: async () => null });
  await expect(disabled.reserve(input(), 'ip')).rejects.toMatchObject({ status: 503 });
});
it('valida URLs e recusa protocolos executáveis', () => {
  for (const url of ['javascript:alert(1)', 'http://loja.test', 'https://user:secret@loja.test']) expect(() => validateGift({ title: 'Presente', url })).toThrow();
  expect(validateGift({ title: ' Presente ', url: 'https://loja.test/item' })).toHaveProperty('title', 'Presente');
});
it('Worker não confirma por GET, recusa CSRF, JSON inválido e corpo excessivo', async () => {
  const worker = createWorker({ weddingId: 'alpha', origin: 'https://alpha.example.test', allowedOrigins: ['https://alpha.example.test'] }, { store, authorize: async () => 'admin', sendEmail: mail });
  const request = (path, options) => worker.fetch(new Request(`https://alpha.example.test/api/gifts${path}`, options), { GIFTS_TOKEN_SECRET: 'x'.repeat(32) });
  expect((await request('/confirm')).status).toBe(404);
  expect((await request('/confirm', { method: 'POST', body: '{}' })).status).toBe(403);
  const headers = { Origin: 'https://alpha.example.test', 'Content-Type': 'application/json' };
  expect((await request('/reserve', { method: 'POST', headers, body: '{' })).status).toBe(400);
  expect((await request('/reserve', { method: 'POST', headers, body: JSON.stringify({ name: 'x'.repeat(9000) }) })).status).toBe(413);
  expect(mail).not.toHaveBeenCalled();
});
it('integra o Worker ao contrato do Resend e usa o link canônico com envio idempotente', async () => {
  const provider = vi.fn().mockResolvedValue(Response.json({ id: 'test-email' }));
  vi.stubGlobal('fetch', provider);
  const origin = 'https://alpha.example.test';
  const worker = createWorker({ weddingId: 'alpha', origin, allowedOrigins: [origin] }, { store, authorize: async () => 'admin' });
  const env = { GIFTS_TOKEN_SECRET: 'x'.repeat(32), RESEND_API_KEY: 'test-only-key', GIFTS_FROM_EMAIL: 'Casal <presentes@example.test>' };
  const response = await worker.fetch(new Request(`${origin}/api/gifts/reserve`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(input()) }), env);
  expect(response.status).toBe(200);
  const [url, options] = provider.mock.calls[0];
  expect(url).toBe('https://api.resend.com/emails');
  expect(options.headers).toMatchObject({ Authorization: 'Bearer test-only-key', 'Idempotency-Key': expect.stringContaining('gift-alpha-') });
  const payload = JSON.parse(options.body);
  expect(payload).toMatchObject({ from: env.GIFTS_FROM_EMAIL, to: ['ana@example.test'] });
  expect(payload.text).toContain(`${origin}/#/presentes/confirmar?reservation=`);
  expect(payload.text).toContain('token=');
  expect(JSON.stringify(await response.json())).not.toContain('token=');
});
