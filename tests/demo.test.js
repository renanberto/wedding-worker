import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('@wedding/core/lib/site.js', () => ({ siteId: 'unit-demo', weddingId: 'unit-demo', demoMode: true }));
import { readDemoResponses, saveDemoResponse, resetDemo } from '@wedding/core/lib/demo.js';
import { submitRsvp, loadResponses } from '@wedding/core/services/rsvpService.js';
beforeEach(() => sessionStorage.clear());
afterEach(() => vi.restoreAllMocks());
it('mantém respostas somente na sessão e permite restaurar exemplos', () => {
  const initial = readDemoResponses().length;
  saveDemoResponse({ name: 'Exemplo local', attendance: 'yes', guests: 2, message: '' });
  expect(readDemoResponses()).toHaveLength(initial + 1);
  expect(readDemoResponses()[0].createdAt.toMillis()).toBeGreaterThan(0);
  resetDemo(); expect(readDemoResponses()).toHaveLength(initial);
});
it('valida o formulário e não envia requisições no modo demonstrativo', async () => {
  const network = vi.spyOn(globalThis, 'fetch');
  await submitRsvp({ name: 'Convidado fictício', attendance: 'yes', guests: 2, message: '' });
  expect((await loadResponses())[0].name).toBe('Convidado fictício');
  expect(network).not.toHaveBeenCalled();
  await expect(submitRsvp({ name: ' ', attendance: 'yes', guests: 2 })).rejects.toThrow();
});
