// ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { isAuthenticated, admin } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (admin && !admin.isActive && location.pathname !== '/kyc') {
    return <Navigate to="/kyc" replace />;
  }
  return <Outlet />;
}
