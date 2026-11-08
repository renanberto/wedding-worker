import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { firebaseReady } from '../../lib/firebase';
import { demoMode } from '../../lib/site';
export default function Login() {
  const { user, isAdmin, loading, login, logout, resetPassword } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function recover(event) {
    const form = event.currentTarget.closest('form');
    const email = form.elements.email;
    if (!email.reportValidity()) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await resetPassword(email.value.trim());
      setNotice('Se o e-mail estiver cadastrado, você receberá as instruções de recuperação.');
    } catch { setError('Não foi possível solicitar a recuperação. Tente novamente mais tarde.'); }
    finally { setBusy(false); }
  }
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    const data = new FormData(event.currentTarget);
    try { await login(data.get('email').trim(), data.get('password')); }
    catch { setError('Não foi possível entrar. Confira seus dados e tente novamente.'); }
    finally { setBusy(false); }
  }
  if (loading) return <main className="admin-shell" role="status">Verificando sessão…</main>;
  if (isAdmin) return <Navigate to="/admin" replace />;
  return <main className="admin-shell admin-login"><Link to="/">← Voltar ao site</Link><div className="form-card"><h1>Área dos noivos</h1><p>Acesso administrativo</p>
    {demoMode ? <><p>Este é um painel de demonstração. As respostas são fictícias ou ficam somente nesta aba. Não é necessário informar uma senha.</p><button className="button-primary" onClick={() => login()}>Explorar painel de exemplo</button></> : <>
    {!firebaseReady && <p role="alert">Acesso ainda não configurado.</p>}
    {user ? <><p role="alert">Esta conta não possui acesso administrativo.</p><button className="button-primary" onClick={() => logout().catch(() => setError('Não foi possível sair. Tente novamente.'))}>Sair e usar outra conta</button></> : <form onSubmit={submit}>
      <label htmlFor="email">E-mail</label><input id="email" name="email" type="email" autoComplete="username" required />
      <label htmlFor="password">Senha</label><input id="password" name="password" type="password" autoComplete="current-password" required />
      <button className="button-primary" disabled={busy || !firebaseReady}>{busy ? 'Entrando…' : 'Entrar'}</button>
      <button type="button" className="recovery-button" disabled={busy || !firebaseReady} onClick={recover}>Esqueci minha senha</button>
    </form>}</>}{notice && <p role="status">{notice}</p>}{error && <p className="form-error" role="alert">{error}</p>}
  </div></main>;
}
