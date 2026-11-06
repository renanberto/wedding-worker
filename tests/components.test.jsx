import { expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
const mocks = vi.hoisted(() => ({ session: {}, submit: vi.fn() }));
vi.mock('../src/contexts/AuthContext', () => ({ useAuth: () => mocks.session }));
vi.mock('../src/services/rsvpService', () => ({ submitRsvp: mocks.submit }));
import ProtectedRoute from '../src/components/admin/ProtectedRoute';
import { RSVP } from '../src/App';
import GuestTable from '../src/components/admin/GuestTable';
function route(session) {
  mocks.session = session;
  render(<MemoryRouter initialEntries={['/admin']}><Routes><Route path="/admin/login" element={<p>Login</p>} /><Route element={<ProtectedRoute />}><Route path="/admin" element={<p>Dados privados</p>} /></Route></Routes></MemoryRouter>);
}
it.each([{ user: null }, { user: { uid: 'other' }, isAdmin: false }])('protege visitantes e usuários sem autorização %s', session => {
  route(session); expect(screen.getByText('Login')).toBeInTheDocument(); expect(screen.queryByText('Dados privados')).not.toBeInTheDocument();
});
it('aguarda sessão e permite administradores', () => { route({ user: {}, isAdmin: true }); expect(screen.getByText('Dados privados')).toBeInTheDocument(); });
it('mostra loading durante verificação de sessão', () => { route({ loading: true }); expect(screen.getByRole('status')).toHaveTextContent('Verificando'); });
async function fill() {
  render(<RSVP />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/Nome completo/), 'Ana Silva');
  await user.click(screen.getByLabelText('Sim, estarei lá!'));
}
it('bloqueia cliques repetidos e só mostra sucesso após confirmação', async () => {
  let finish;
  mocks.submit.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await fill();
  const button = screen.getByRole('button', { name: /Enviar confirmação/ });
  fireEvent.submit(button.closest('form')); fireEvent.submit(button.closest('form'));
  expect(button).toBeDisabled(); expect(mocks.submit).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Recebemos sua resposta!')).not.toBeInTheDocument();
  finish(); await screen.findByText('Recebemos sua resposta!');
  mocks.submit.mockClear();
});
it('mostra erro e mantém os valores para nova tentativa', async () => {
  mocks.submit.mockRejectedValue(new Error('Falha de envio'));
  await fill(); fireEvent.click(screen.getByRole('button', { name: /Enviar confirmação/ }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Falha de envio'));
  expect(screen.getByLabelText(/Nome completo/)).toHaveValue('Ana Silva');
  expect(screen.queryByText('Recebemos sua resposta!')).not.toBeInTheDocument();
});
it('mostra estado vazio e mensagem completa na tabela', async () => {
  const { rerender } = render(<GuestTable rows={[]} />);
  expect(screen.getByRole('status')).toHaveTextContent('Nenhuma confirmação');
  rerender(<GuestTable rows={[{ id: '1', name: 'Ana', attendance: 'yes', guests: 1, message: 'Uma mensagem completa' }]} />);
  await userEvent.click(screen.getByText('Ver mensagem completa'));
  expect(screen.getByText('Uma mensagem completa')).toBeVisible();
});
