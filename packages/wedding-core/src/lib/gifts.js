export function validateGift(input) {
  const title = typeof input?.title === 'string' ? input.title.trim() : '';
  const description = typeof input?.description === 'string' ? input.description.trim() : '';
  if (!title || title.length > 120 || description.length > 1000) throw new Error('Informe um título de até 120 caracteres e descrição de até 1.000 caracteres.');
  const links = {};
  for (const field of ['url', 'imageUrl']) {
    const value = typeof input[field] === 'string' ? input[field].trim() : '';
    if (value) {
      let url; try { url = new URL(value); } catch { throw new Error('Use links completos começando com https://.'); }
      if (value.length > 2000 || url.protocol !== 'https:' || url.username || url.password) throw new Error('Use links completos começando com https://.');
    }
    links[field] = value;
  }
  return { title, description, ...links };
}
export function validateGiftGuest(input) {
  const name = typeof input?.name === 'string' ? input.name.trim() : '';
  const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (!name || name.length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Informe seu nome e um e-mail válido.');
  return { name, email };
}
export function giftStatus(gift, now = Date.now()) {
  if (gift.status === 'pending' && Date.parse(gift.expiresAt) <= now) return 'available';
  return gift.status || 'available';
}
