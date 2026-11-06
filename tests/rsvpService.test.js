import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ addDoc: vi.fn(), db: {} }));
vi.mock('../src/lib/firebase', () => ({ db: mocks.db }));
vi.mock('firebase/firestore', () => ({ addDoc: mocks.addDoc, collection: () => 'rsvp_responses', serverTimestamp: () => 'SERVER_TIME', getDocs: vi.fn(), orderBy: vi.fn(), query: vi.fn() }));
import { submitRsvp } from '../src/services/rsvpService';
beforeEach(() => vi.clearAllMocks());
it('aguarda confirmação e usa timestamp do servidor', async () => {
  mocks.addDoc.mockResolvedValue({ id: 'saved' });
  await submitRsvp({ name: 'Ana', attendance: 'no', guests: 9, message: '' });
  expect(mocks.addDoc).toHaveBeenCalledWith('rsvp_responses', { name: 'Ana', attendance: 'no', guests: 0, message: '', createdAt: 'SERVER_TIME' });
});
it('trata falha de persistência sem expor detalhes internos', async () => {
  mocks.addDoc.mockRejectedValue(new Error('permission-denied'));
  await expect(submitRsvp({ name: 'Ana', attendance: 'yes', guests: 1 })).rejects.toThrow('Não foi possível registrar');
});
it('não envia dados inválidos', async () => {
  await expect(submitRsvp({ name: ' ', attendance: 'yes', guests: 1 })).rejects.toThrow();
  expect(mocks.addDoc).not.toHaveBeenCalled();
});
