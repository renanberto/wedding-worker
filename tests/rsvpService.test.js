import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ addDoc: vi.fn(), db: {} }));
vi.mock('@wedding/core/lib/firebase.js', () => ({ db: mocks.db }));
vi.mock('firebase/firestore', () => ({ addDoc: mocks.addDoc, collection: (_db, ...path) => path.join('/'), serverTimestamp: () => 'SERVER_TIME', getDocs: vi.fn(), orderBy: vi.fn(), query: vi.fn() }));
import { submitRsvp } from '@wedding/core/services/rsvpService.js';
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());
it('aguarda confirmação e usa timestamp do servidor', async () => {
  mocks.addDoc.mockResolvedValue({ id: 'saved' });
  await submitRsvp({ name: 'Ana', attendance: 'no', guests: 9, message: '' });
  expect(mocks.addDoc).toHaveBeenCalledWith('weddings/test/rsvp_responses', { name: 'Ana', attendance: 'no', guests: 0, message: '', createdAt: 'SERVER_TIME' });
});
it('trata falha de persistência sem expor detalhes internos', async () => {
  mocks.addDoc.mockRejectedValue(new Error('permission-denied'));
  await expect(submitRsvp({ name: 'Ana', attendance: 'yes', guests: 1 })).rejects.toThrow('Não foi possível registrar');
});
it.each(['permission-denied', 'unauthenticated'])('preserva %s e orienta contato sem sugerir falha de conexão', async code => {
  const cause = Object.assign(new Error('Detalhes internos'), { code });
  mocks.addDoc.mockRejectedValue(cause);
  await expect(submitRsvp({ name: 'Ana', attendance: 'yes', guests: 1 })).rejects.toMatchObject({
    code, cause, message: expect.stringContaining('avise os noivos'),
  });
  expect(console.error).toHaveBeenCalledWith('[RSVP] Falha ao registrar resposta.', { code });
});
it('não envia dados inválidos', async () => {
  await expect(submitRsvp({ name: ' ', attendance: 'yes', guests: 1 })).rejects.toThrow();
  expect(mocks.addDoc).not.toHaveBeenCalled();
});
