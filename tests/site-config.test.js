import { expect, it } from 'vitest';
import { validateSites } from '../scripts/site-config.js';
const site = { id: 'one', workspace: '@wedding/one', project: 'wedding-one', mode: 'firebase', firebaseProject: 'wedding-one', domain: 'one.example.com' };
it('recusa reutilizar o Firebase entre casamentos', () => {
  expect(() => validateSites([site, { ...site, id: 'two', workspace: '@wedding/two', project: 'wedding-two', domain: 'two.example.com' }])).toThrow('projeto exclusivo');
});
it('recusa travessia de diretório e demonstração ligada ao Firebase', () => {
  expect(() => validateSites([{ ...site, id: undefined }])).toThrow();
  expect(() => validateSites([{ ...site, id: '../two' }])).toThrow();
  expect(() => validateSites([{ ...site, mode: 'demo' }])).toThrow('demonstração');
});
it('permite um segundo site demonstrativo independente', () => {
  expect(validateSites([site, { id: 'demo', workspace: '@wedding/demo', project: 'wedding-demo', mode: 'demo', firebaseProject: '', domain: '' }])).toHaveLength(2);
});
