import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
const AdminLayout = React.lazy(() => import('./pages/admin/AdminLayout'));
const ProtectedRoute = React.lazy(() => import('./components/admin/ProtectedRoute'));
const Login = React.lazy(() => import('./pages/admin/Login'));
const Dashboard = React.lazy(() => import('./pages/admin/Dashboard'));

// Compatibilidade com os links de seção anteriores ao roteador.
if (/^#[a-z][a-z0-9-]*$/i.test(window.location.hash)) {
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
