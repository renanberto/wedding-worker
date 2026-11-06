import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
export default function ProtectedRoute() {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <main className="admin-shell" role="status">Verificando sessão…</main>;
  if (!user || !isAdmin) return <Navigate to="/admin/login" replace />;
  return <Outlet />;
}
