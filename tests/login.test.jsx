import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const mocks = vi.hoisted(() => ({ reset: vi.fn() }));
vi.mock('@wedding/core/contexts/AuthContext.jsx', () => ({ useAuth: () => ({ user: null, isAdmin: false, loading: false, resetPassword: mocks.reset }) }));
vi.mock('@wedding/core/lib/firebase.js', () => ({ firebaseReady: true }));
import Login from '@wedding/core/pages/admin/Login.jsx';
beforeEach(() => vi.clearAllMocks());
it('permite recuperar acesso com e-mail, sem exigir senha', async () => {
  mocks.reset.mockResolvedValue();
  render(<MemoryRouter><Login /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'pessoa@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Esqueci minha senha' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Se o e-mail estiver cadastrado');
  expect(mocks.reset).toHaveBeenCalledWith('pessoa@example.com');
});
it('trata falha de recuperação sem expor detalhes do provedor', async () => {
  mocks.reset.mockRejectedValue(new Error('internal credential details'));
  render(<MemoryRouter><Login /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'pessoa@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Esqueci minha senha' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível solicitar a recuperação');
  expect(screen.queryByText('internal credential details')).not.toBeInTheDocument();
});
