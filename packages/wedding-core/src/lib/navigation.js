// Entradas diretas precisam funcionar tanto na raiz quanto em subdiretórios.
export function getAdminRedirect({ pathname, search = '', hash = '' }, base = '/') {
  const basePath = new URL(base, 'https://local.invalid').pathname.replace(/\/?$/, '/');
  if (!pathname.startsWith(basePath)) return null;
  const route = '/' + pathname.slice(basePath.length).replace(/\/+$/, '');
  if (!['/admin', '/admin/login'].includes(route)) return null;
  return `${basePath}#${route}${search}${hash}`;
}
