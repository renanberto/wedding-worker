import { demoMode, siteId } from '../lib/site';
import { validateGift, validateGiftGuest, giftStatus } from '../lib/gifts';

const key = `wedding-demo:${siteId}:gifts`;
const seed = () => ({ gifts: [
  { id: 'jantar', title: 'Aparelho de jantar', description: 'Para receber as pessoas queridas em nossa casa.', url: '', imageUrl: '', status: 'available' },
  { id: 'cafe', title: 'Cafeteira', description: 'Para começar nossos dias com um bom café.', url: '', imageUrl: '', status: 'available' },
], reservations: [] });
function readDemo() { try { return JSON.parse(sessionStorage.getItem(key)) || seed(); } catch { return seed(); } }
function writeDemo(data) { sessionStorage.setItem(key, JSON.stringify(data)); }
async function call(path, input, admin = false) {
  const { auth } = admin ? await import('../lib/firebase') : {};
  const token = admin ? await auth?.currentUser?.getIdToken() : null;
  if (admin && !token) throw new Error('Entre novamente para acessar os presentes.');
  const response = await fetch(`/api/gifts${path}`, { method: input === undefined ? 'GET' : 'POST', headers: { ...(input === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: input === undefined ? undefined : JSON.stringify(input), signal: AbortSignal.timeout(25000) });
  let result; try { result = await response.json(); } catch { throw new Error('A lista de presentes está temporariamente indisponível.'); }
  if (!response.ok) throw Object.assign(new Error(result.error || 'Não foi possível concluir. Tente novamente.'), { status: response.status });
  return result;
}
export async function loadGifts(admin = false) {
  if (!demoMode) return call(admin ? '/admin' : '', undefined, admin);
  const data = readDemo();
  return { gifts: data.gifts.filter(g => admin || !g.archived).map(g => ({ ...g, status: giftStatus(g) })), ...(admin ? { reservations: data.reservations.map(r => ({ ...r, status: r.status === 'pending' && Date.parse(r.expiresAt) <= Date.now() ? 'expired' : r.status })) } : { reservationsEnabled: true }) };
}
export async function editGift(input) {
  if (!demoMode) return call('/admin', input, true);
  const data = readDemo();
  const gift = data.gifts.find(g => g.id === input.id);
  if (gift && giftStatus(gift) !== 'available' && input.action !== 'release') throw new Error('Libere a reserva antes de editar ou arquivar este presente.');
  if (input.action === 'save') {
    const fields = validateGift(input);
    if (gift) Object.assign(gift, fields, { archived: false });
    else data.gifts.unshift({ id: crypto.randomUUID(), ...fields, status: 'available' });
  } else if (gift && input.action === 'archive') gift.archived = true;
  else if (gift && input.action === 'release') {
    gift.status = 'available'; gift.expiresAt = null;
    data.reservations.filter(r => r.giftId === gift.id && ['pending', 'confirmed'].includes(r.status)).forEach(r => { r.status = 'cancelled'; });
  }
  writeDemo(data);
}
export async function reserveGift(input) {
  if (!demoMode) return call('/reserve', input);
  const guest = validateGiftGuest(input); const data = readDemo();
  const gift = data.gifts.find(g => g.id === input.giftId && !g.archived);
  if (!gift || giftStatus(gift) !== 'available') throw new Error('Presente indisponível. Atualize a lista.');
  const id = crypto.randomUUID(); const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 60000).toISOString();
  gift.status = 'pending'; gift.expiresAt = expiresAt; gift.reservationId = id;
  data.reservations.unshift({ id, token, ...guest, giftId: gift.id, giftTitle: gift.title, status: 'pending', expiresAt, createdAt: new Date().toISOString() });
  writeDemo(data);
  return { status: 'pending', expiresAt, demoLink: `/#/presentes/confirmar?reservation=${id}&token=${token}` };
}
export async function confirmGift(input) {
  if (!demoMode) return call('/confirm', input);
  const data = readDemo(); const reservation = data.reservations.find(r => r.id === input.reservation && r.token === input.token);
  const gift = data.gifts.find(g => g.id === reservation?.giftId);
  if (!reservation || !gift || gift.reservationId !== reservation.id || !['pending', 'confirmed'].includes(reservation.status) || (reservation.status === 'pending' && Date.parse(reservation.expiresAt) <= Date.now())) throw new Error('Link inválido, cancelado ou expirado.');
  gift.status = 'confirmed'; reservation.status = 'confirmed'; writeDemo(data);
  return { status: 'confirmed', title: gift.title };
}
