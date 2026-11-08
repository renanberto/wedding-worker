import { expect, it } from 'vitest';
import { validateSites } from '../scripts/site-config.js';
const site = { id: 'one', weddingId: 'one', workspace: '@wedding/one', project: 'wedding-one', mode: 'firebase', firebaseProject: 'wedding-one', domain: 'one.example.com' };
it('permite compartilhar Firebase com identificadores distintos', () => {
  expect(validateSites([site, { ...site, id: 'two', weddingId: 'two', workspace: '@wedding/two', project: 'wedding-two', domain: 'two.example.com' }])).toHaveLength(2);
});
it('recusa travessia de diretório e demonstração ligada ao Firebase', () => {
  expect(() => validateSites([{ ...site, id: undefined }])).toThrow();
  expect(() => validateSites([{ ...site, id: '../two' }])).toThrow();
  expect(() => validateSites([{ ...site, mode: 'demo' }])).toThrow('demonstração');
});
it('permite um segundo site demonstrativo independente', () => {
  expect(validateSites([site, { id: 'demo', weddingId: 'demo', workspace: '@wedding/demo', project: 'wedding-demo', mode: 'demo', firebaseProject: '', domain: '' }])).toHaveLength(2);
});

it('recusa identificadores repetidos e projetos divergentes', () => { expect(() => validateSites([site, { ...site, id: 'two', workspace: '@wedding/two', project: 'wedding-two', domain: '', weddingId: 'one' }])).toThrow('duplicatas'); expect(() => validateSites([{ ...site, firebaseProject: 'other-project' }], 'wedding-one')).toThrow('compartilhado'); });
