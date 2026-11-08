import { accessToken, firestoreStore } from './firestore.js';
import { giftService, GiftError } from './gifts.js';

const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } });
async function body(request) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw new GiftError(415, 'Envie uma solicitação JSON.');
  let size = 0; const chunks = []; const reader = request.body?.getReader();
  if (!reader) throw new GiftError(400, 'Solicitação inválida.');
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > 8192) { await reader.cancel(); throw new GiftError(413, 'Solicitação muito grande.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { const parsed = JSON.parse(new TextDecoder().decode(bytes)); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(); return parsed; }
  catch { throw new GiftError(400, 'Solicitação inválida.'); }
}
export function createWorker(config, dependencies = {}) {
  return { async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      if (!url.pathname.startsWith('/api/gifts')) return json({ error: 'Página não encontrada.' }, 404);
      if (request.method !== 'GET' && request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
      if (request.method === 'POST' && !config.allowedOrigins.includes(request.headers.get('Origin'))) return json({ error: 'Origem não permitida.' }, 403);
      if (!dependencies.store && !env.GIFTS_FIREBASE_REFRESH_TOKEN) throw new GiftError(503, 'A lista de presentes está temporariamente indisponível.');
      const store = dependencies.store || firestoreStore({ projectId: config.projectId, token: () => accessToken(env.GIFTS_FIREBASE_REFRESH_TOKEN, config.apiKey, config.projectId) });
      const authorize = dependencies.authorize || (async token => {
        if (!token || token.length > 8192) throw new GiftError(401, 'Entre novamente para acessar os presentes.');
        const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(config.apiKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: token }), signal: AbortSignal.timeout(10000) });
        const user = (await response.json()).users?.[0];
        if (!response.ok || !user?.localId || user.disabled) throw new GiftError(401, 'Entre novamente para acessar os presentes.');
        return user.localId;
      });
      const sendEmail = dependencies.sendEmail || (env.RESEND_API_KEY && env.GIFTS_FROM_EMAIL ? async mail => {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST', signal: AbortSignal.timeout(10000),
          headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': mail.idempotencyKey },
          body: JSON.stringify({ from: env.GIFTS_FROM_EMAIL, to: [mail.to], subject: 'Confirme sua escolha de presente', text: `Olá, ${mail.name}!\n\nVocê escolheu o presente: ${mail.title}.\n\nPara confirmar sua escolha, abra o link e clique em Confirmar presente:\n${mail.url}\n\nA reserva expira em 30 minutos. A confirmação registra sua escolha; a compra e a entrega são combinadas com os noivos.\n\nSe não foi você, ignore esta mensagem. O presente será liberado automaticamente.` }),
        });
        if (!response.ok) throw new Error('mail/send-failed');
      } : null);
      const service = giftService({ store, weddingId: config.weddingId, tokenSecret: env.GIFTS_TOKEN_SECRET, origin: config.origin, authorize, sendEmail, now: dependencies.now });
      const token = request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
      if (request.method === 'GET' && url.pathname === '/api/gifts') return json(await service.list());
      if (request.method === 'GET' && url.pathname === '/api/gifts/admin') return json(await service.adminList(token));
      if (request.method === 'POST') {
        const input = await body(request);
        if (url.pathname === '/api/gifts/admin') return json(await service.edit(token, input));
        if (url.pathname === '/api/gifts/reserve') return json(await service.reserve(input, request.headers.get('CF-Connecting-IP') || 'unknown'));
        if (url.pathname === '/api/gifts/confirm') return json(await service.confirm(input));
      }
      return json({ error: 'Página não encontrada.' }, 404);
    } catch (error) {
      if (error instanceof GiftError) return json({ error: error.message }, error.status);
      // Não registrar conteúdo de requisições, tokens, e-mails ou erros do provedor.
      console.error('[Gifts] Falha interna.');
      return json({ error: 'Não foi possível concluir agora. Tente novamente em alguns instantes.' }, 503);
    }
  } };
}
