// Entradas diretas precisam funcionar tanto na raiz quanto em subdiretórios.
export function getAdminRedirect({ pathname, search = '', hash = '' }, base = '/') {
  const basePath = new URL(base, 'https://local.invalid').pathname.replace(/\/?$/, '/');
  if (!pathname.startsWith(basePath)) return null;
  const route = '/' + pathname.slice(basePath.length).replace(/\/+$/, '');
  if (!['/admin', '/admin/login', '/admin/presentes'].includes(route)) return null;
  return `${basePath}#${route}${search}${hash}`;
}

export function normalizeLocation() {
  const redirect = getAdminRedirect(window.location, import.meta.env.BASE_URL);
  if (redirect) window.history.replaceState(null, '', redirect);
  else if (/^#[a-z][a-z0-9-]*$/i.test(window.location.hash)) {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/${window.location.hash}`);
  }
}
