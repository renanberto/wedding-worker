import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { firebaseReady } from '../../lib/firebase';
export default function Login() {
  const { user, isAdmin, loading, login, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
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
    {!firebaseReady && <p role="alert">Acesso ainda não configurado.</p>}
    {user ? <><p role="alert">Esta conta não possui acesso administrativo.</p><button className="button-primary" onClick={() => logout().catch(() => setError('Não foi possível sair. Tente novamente.'))}>Sair e usar outra conta</button></> : <form onSubmit={submit}>
      <label htmlFor="email">E-mail</label><input id="email" name="email" type="email" autoComplete="username" required />
      <label htmlFor="password">Senha</label><input id="password" name="password" type="password" autoComplete="current-password" required />
      <button className="button-primary" disabled={busy || !firebaseReady}>{busy ? 'Entrando…' : 'Entrar'}</button>
    </form>}{error && <p className="form-error" role="alert">{error}</p>}
  </div></main>;
}
