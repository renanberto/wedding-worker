import { validateGift, validateGiftGuest, giftStatus } from '../packages/wedding-core/src/lib/gifts.js';
import { hasWeddingAccess, validateWeddingId } from '../packages/wedding-core/src/lib/wedding.js';

export class GiftError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new GiftError(status, message); };
const validId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
export async function digest(value) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function sign(secret, value) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)))].map(b => b.toString(16).padStart(2, '0')).join('');
}
export function giftService({ store, weddingId, tokenSecret, origin, sendEmail, authorize, now = () => Date.now() }) {
  validateWeddingId(weddingId);
  const root = `weddings/${weddingId}`;
  const giftPath = id => `${root}/gifts/${id}`;
  const reservationPath = id => `${root}/gift_reservations/${id}`;
  const requireAdmin = async token => {
    const uid = await authorize(token);
    if (!uid || !hasWeddingAccess(await store.get(`${root}/members/${uid}`))) fail(403, 'Esta conta não possui acesso aos presentes deste casamento.');
  };
  const publicGift = gift => ({ id: gift.id, title: gift.title, description: gift.description, url: gift.url, imageUrl: gift.imageUrl, status: giftStatus(gift, now()) });
  async function closeFailed(id, giftId) {
    await store.transaction(async tx => {
      const reservation = await tx.get(reservationPath(id));
      const gift = await tx.get(giftPath(giftId));
      if (reservation?.status === 'pending') {
        tx.set(reservationPath(id), { ...reservation, status: 'failed', updatedAt: new Date(now()).toISOString() });
        if (gift?.reservationId === id) tx.set(giftPath(giftId), { ...gift, status: 'available', reservationId: null, expiresAt: null });
      }
    });
  }
  return {
    async list() {
      const wedding = await store.get(root);
      if (!wedding?.active) return { gifts: [], reservationsEnabled: false };
      return { gifts: (await store.list(`${root}/gifts`, { all: true })).filter(g => !g.archived).map(publicGift), reservationsEnabled: Boolean(sendEmail && tokenSecret?.length >= 32) };
    },
    async adminList(token) {
      await requireAdmin(token);
      const [gifts, reservations] = await Promise.all([store.list(`${root}/gifts`, { all: true }), store.list(`${root}/gift_reservations`)]);
      return { gifts: gifts.map(g => ({ ...publicGift(g), archived: g.archived })), reservations: reservations.map(r => ({ id: r.id, giftId: r.giftId, giftTitle: r.giftTitle, name: r.name, email: r.email, status: r.status === 'pending' && Date.parse(r.expiresAt) <= now() ? 'expired' : r.status, createdAt: r.createdAt })) };
    },
    async edit(token, input) {
      await requireAdmin(token);
      const action = input.action;
      if (!['save', 'archive', 'release'].includes(action)) fail(400, 'Operação inválida.');
      if (action !== 'save' && !input.id) fail(400, 'Informe o presente.');
      const id = input.id || crypto.randomUUID();
      if (!validId(id)) fail(400, 'Presente inválido.');
      let fields;
      if (action === 'save') { try { fields = validateGift(input); } catch (e) { fail(400, e.message); } }
      await store.transaction(async tx => {
        const gift = await tx.get(giftPath(id));
        const reservation = gift?.reservationId ? await tx.get(reservationPath(gift.reservationId)) : null;
        if (input.id && !gift) fail(404, 'Presente não encontrado.');
        if (gift && giftStatus(gift, now()) !== 'available' && action !== 'release') fail(409, 'Libere a reserva antes de editar ou arquivar este presente.');
        const time = new Date(now()).toISOString();
        if (action === 'release') {
          if (!gift) fail(404, 'Presente não encontrado.');
          if (reservation && ['pending', 'confirmed'].includes(reservation.status)) tx.set(reservationPath(gift.reservationId), { ...reservation, status: 'cancelled', updatedAt: time });
          tx.set(giftPath(id), { ...gift, status: 'available', reservationId: null, expiresAt: null, updatedAt: time });
        } else tx.set(giftPath(id), { ...(gift || { createdAt: time }), ...(fields || {}), archived: action === 'archive', status: 'available', reservationId: null, expiresAt: null, updatedAt: time });
      });
      return { id };
    },
    async reserve(input, ip) {
      if (!sendEmail || !tokenSecret || tokenSecret.length < 32) fail(503, 'As reservas estão temporariamente indisponíveis. Tente mais tarde.');
      if (!validId(input.giftId) || !validId(input.requestId) || input.website) fail(400, 'Solicitação inválida.');
      let guest; try { guest = validateGiftGuest(input); } catch (e) { fail(400, e.message); }
      const id = await sign(tokenSecret, `request:${weddingId}:${input.giftId}:${input.requestId}`);
      const token = await sign(tokenSecret, `confirm:${weddingId}:${id}`);
      const tokenHash = await digest(token);
      const hour = Math.floor(now() / 3600000);
      const limits = await Promise.all([[`ip:${ip}`, 10], [`email:${guest.email}`, 3], ['event', 100]].map(async ([key, max]) => ({ path: `${root}/gift_rate_limits/${await sign(tokenSecret, `${hour}:${key}`)}`, max })));
      const result = await store.transaction(async tx => {
        const wedding = await tx.get(root);
        const gift = await tx.get(giftPath(input.giftId));
        const existing = await tx.get(reservationPath(id));
        const counters = await Promise.all(limits.map(limit => tx.get(limit.path)));
        if (!wedding?.active || !gift || gift.archived) fail(404, 'Presente não encontrado ou lista encerrada.');
        if (existing) {
          if (existing.email !== guest.email || existing.name !== guest.name) fail(409, 'Inicie uma nova escolha.');
          if (existing.status !== 'pending' || Date.parse(existing.expiresAt) <= now() || gift.reservationId !== id) fail(409, 'Esta solicitação já foi concluída ou expirou. Atualize a lista.');
          return existing;
        }
        if (giftStatus(gift, now()) !== 'available') fail(409, 'Este presente acabou de ser reservado. Escolha outro na lista.');
        if (counters.some((counter, i) => (counter?.count || 0) >= limits[i].max)) fail(429, 'Muitas tentativas. Aguarde antes de escolher novamente.');
        const time = new Date(now()).toISOString();
        const expiresAt = new Date(now() + 30 * 60000).toISOString();
        const reservation = { giftId: input.giftId, giftTitle: gift.title, ...guest, tokenHash, status: 'pending', createdAt: time, updatedAt: time, expiresAt };
        tx.set(reservationPath(id), reservation);
        tx.set(giftPath(input.giftId), { ...gift, status: 'pending', reservationId: id, expiresAt });
        limits.forEach((limit, i) => tx.set(limit.path, { count: (counters[i]?.count || 0) + 1, createdAt: time, expiresAt: new Date(now() + 7 * 86400000).toISOString() }));
        return reservation;
      });
      try {
        await sendEmail({ to: guest.email, name: guest.name, title: result.giftTitle, url: `${origin}/#/presentes/confirmar?reservation=${id}&token=${token}`, idempotencyKey: `gift-${weddingId}-${id}` });
      } catch { await closeFailed(id, input.giftId); fail(503, 'Não foi possível enviar o e-mail. O presente foi liberado; tente novamente em alguns instantes.'); }
      return { status: 'pending', expiresAt: result.expiresAt };
    },
    async confirm(input) {
      if (!/^[a-f0-9]{64}$/.test(input.reservation || '') || !/^[a-f0-9]{64}$/.test(input.token || '')) fail(400, 'Link inválido ou expirado.');
      const tokenHash = await digest(input.token);
      return store.transaction(async tx => {
        const reservation = await tx.get(reservationPath(input.reservation));
        if (!reservation || reservation.tokenHash !== tokenHash) fail(400, 'Link inválido ou expirado.');
        const gift = await tx.get(giftPath(reservation.giftId));
        const wedding = await tx.get(root);
        if (!wedding?.active || !gift || gift.archived || gift.reservationId !== input.reservation) fail(410, 'Esta reserva não está mais disponível. Consulte a lista de presentes.');
        if (reservation.status === 'confirmed') return { status: 'confirmed', title: reservation.giftTitle };
        if (reservation.status !== 'pending' || Date.parse(reservation.expiresAt) <= now()) fail(410, 'A reserva expirou ou foi cancelada. Escolha novamente na lista.');
        tx.set(reservationPath(input.reservation), { ...reservation, status: 'confirmed', updatedAt: new Date(now()).toISOString() });
        tx.set(giftPath(reservation.giftId), { ...gift, status: 'confirmed', expiresAt: null });
        return { status: 'confirmed', title: reservation.giftTitle };
      });
    },
  };
}
