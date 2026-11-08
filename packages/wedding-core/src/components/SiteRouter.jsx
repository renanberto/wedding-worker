import React from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { demoMode } from '../lib/site';
const AdminLayout = React.lazy(() => import('../pages/admin/AdminLayout'));
const ProtectedRoute = React.lazy(() => import('./admin/ProtectedRoute'));
const Login = React.lazy(() => import('../pages/admin/Login'));
const Dashboard = React.lazy(() => import('../pages/admin/Dashboard'));

class SiteErrorBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { console.error('[Site] Falha de renderização.', { code: 'app/render-error' }); }
  render() {
    if (this.state.failed) return <main className="admin-shell" role="alert"><h1>Não foi possível carregar esta página.</h1><p>Atualize a página para tentar novamente.</p><button onClick={() => window.location.reload()}>Atualizar página</button></main>;
    return this.props.children;
  }
}
export default function SiteRouter({ PublicPage }) {
  return <SiteErrorBoundary><HashRouter>
    {demoMode && <aside className="demo-notice">Site de demonstração · casal e evento fictícios · respostas apenas nesta aba</aside>}
    <React.Suspense fallback={<main className="admin-shell" role="status">Carregando…</main>}><Routes>
      <Route path="/" element={<PublicPage />} />
      <Route element={<AdminLayout />}><Route path="/admin/login" element={<Login />} />
        <Route element={<ProtectedRoute />}><Route path="/admin" element={<Dashboard />} /></Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></React.Suspense>
  </HashRouter></SiteErrorBoundary>;
}
