import { beforeEach, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
const mocks = vi.hoisted(() => ({ listener: null, getDoc: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), persistence: vi.fn() }));
vi.mock('@wedding/core/lib/firebase.js', () => ({ auth: {}, db: {} }));
vi.mock('firebase/auth', () => ({
  browserLocalPersistence: 'LOCAL',
  onAuthStateChanged: (_auth, listener) => { mocks.listener = listener; return () => {}; },
  setPersistence: mocks.persistence, signInWithEmailAndPassword: mocks.signIn, signOut: mocks.signOut,
}));
vi.mock('firebase/firestore', () => ({ doc: (_db, collection, uid) => `${collection}/${uid}`, getDoc: mocks.getDoc }));
import { AuthProvider, useAuth } from '@wedding/core/contexts/AuthContext.jsx';
function Session() {
  const { user, isAdmin, loading, login, logout } = useAuth();
  return <><p>{loading ? 'verificando' : isAdmin ? 'autorizado' : user ? 'sem autorização' : 'visitante'}</p><button onClick={() => login('admin@example.test', 'test-only-password')}>Entrar</button><button onClick={logout}>Sair</button></>;
}
beforeEach(() => vi.clearAllMocks());
it('valida UID em documento protegido e encerra sessão', async () => {
  mocks.getDoc.mockResolvedValue({ exists: () => true });
  render(<AuthProvider><Session /></AuthProvider>);
  expect(screen.getByText('verificando')).toBeInTheDocument();
  await act(() => mocks.listener({ uid: 'allowed' }));
  expect(mocks.getDoc).toHaveBeenCalledWith('admins/allowed');
  expect(screen.getByText('autorizado')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Sair'));
  expect(mocks.signOut).toHaveBeenCalled();
  await act(() => mocks.listener(null));
  expect(screen.getByText('visitante')).toBeInTheDocument();
});
it.each([false, 'error'])('nega acesso se o UID não estiver autorizado ou a verificação falhar: %s', async result => {
  if (result === 'error') mocks.getDoc.mockRejectedValue(new Error('offline'));
  else mocks.getDoc.mockResolvedValue({ exists: () => false });
  render(<AuthProvider><Session /></AuthProvider>);
  await act(() => mocks.listener({ uid: 'other' }));
  expect(screen.getByText('sem autorização')).toBeInTheDocument();
});
it('configura persistência antes do login', async () => {
  mocks.persistence.mockResolvedValue();
  render(<AuthProvider><Session /></AuthProvider>);
  fireEvent.click(screen.getByText('Entrar'));
  await waitFor(() => expect(mocks.signIn).toHaveBeenCalledWith({}, 'admin@example.test', 'test-only-password'));
  expect(mocks.persistence).toHaveBeenCalledWith({}, 'LOCAL');
});
it('ignora autorização antiga se o usuário sair durante a leitura', async () => {
  let finish;
  mocks.getDoc.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  render(<AuthProvider><Session /></AuthProvider>);
  let pending;
  act(() => { pending = mocks.listener({ uid: 'allowed' }); });
  await act(() => mocks.listener(null));
  await act(async () => { finish({ exists: () => true }); await pending; });
  expect(screen.getByText('visitante')).toBeInTheDocument();
});
