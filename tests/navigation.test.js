import { expect, it } from 'vitest';
import { getAdminRedirect } from '../src/lib/navigation';
it.each([
  ['/admin', '/', '/#/admin'],
  ['/admin/', '/', '/#/admin'],
  ['/admin/login', '/', '/#/admin/login'],
  ['/admin/login/', '/', '/#/admin/login'],
  ['/wedding-worker/admin', '/wedding-worker/', '/wedding-worker/#/admin'],
  ['/wedding-worker/admin/login/', '/wedding-worker/', '/wedding-worker/#/admin/login'],
])('normaliza entrada direta %s com base %s', (pathname, base, expected) => {
  expect(getAdminRedirect({ pathname }, base)).toBe(expected);
});
it('preserva parâmetros e fragmentos no roteador', () => {
  expect(getAdminRedirect({ pathname: '/admin/login', search: '?from=invite', hash: '#form' })).toBe('/#/admin/login?from=invite#form');
});
it.each(['/', '/other', '/admin/unknown', '/administer', '/other/admin'])('não redireciona caminhos desconhecidos %s', pathname => {
  expect(getAdminRedirect({ pathname })).toBeNull();
});
it('não remove um prefixo de hospedagem diferente', () => {
  expect(getAdminRedirect({ pathname: '/admin/login' }, '/wedding-worker/')).toBeNull();
});
