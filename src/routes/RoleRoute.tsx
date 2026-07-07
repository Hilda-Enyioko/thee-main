import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RoleRoute({ allow }: { allow: 'provider' | 'distributor' }) {
  const { admin } = useAuth();
  if (!admin) return <Navigate to="/login" replace />;
  if (!admin.isActive) return <Navigate to="/kyc" replace />;
  return admin.partnerType === allow ? <Outlet /> : <Navigate to="/analytics" replace />;
}
