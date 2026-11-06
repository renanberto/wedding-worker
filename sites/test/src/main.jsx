import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import { getAdminRedirect } from '@wedding/core/lib/navigation.js';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
const AdminLayout = React.lazy(() => import('@wedding/core/pages/admin/AdminLayout.jsx'));
const ProtectedRoute = React.lazy(() => import('@wedding/core/components/admin/ProtectedRoute.jsx'));
const Login = React.lazy(() => import('@wedding/core/pages/admin/Login.jsx'));
const Dashboard = React.lazy(() => import('@wedding/core/pages/admin/Dashboard.jsx'));

// Compatibilidade com os links de seção anteriores ao roteador.
const adminRedirect = getAdminRedirect(window.location, import.meta.env.BASE_URL);
if (adminRedirect) {
  window.history.replaceState(null, '', adminRedirect);
} else if (/^#[a-z][a-z0-9-]*$/i.test(window.location.hash)) {
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/${window.location.hash}`);
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode><HashRouter><React.Suspense fallback={<main className="admin-shell" role="status">Carregando…</main>}><Routes>
    <Route path="/" element={<App />} />
    <Route element={<AdminLayout />}><Route path="/admin/login" element={<Login />} />
    <Route element={<ProtectedRoute />}><Route path="/admin" element={<Dashboard />} /></Route></Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></React.Suspense></HashRouter></React.StrictMode>
);
