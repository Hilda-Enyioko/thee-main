import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import type { Kind } from '../lib/session';
import BootScreen from '../components/BootScreen';

// Only users of this portal kind get through. Others go to their own portal,
// and signed-out users go to this portal's login.
export function RequireKind({ kind }: { kind: Kind }) {
  const s = useSession();
  const location = useLocation();
  if (s.phase === 'loading') return <BootScreen waking={s.waking} />;
  if (s.phase === 'anon') return <Navigate to={`/${kind}/login`} replace state={{ from: location.pathname }} />;
  if (s.kind !== kind) return <Navigate to={`/${s.kind}`} replace />;
  return <Outlet />;
}

// Screens that need an approved organisation. Everyone else sees the status
// screen on the portal overview instead.
export function RequireApproved() {
  const { kind, org } = useSession();
  if (org?.status !== 'APPROVED') return <Navigate to={`/${kind}`} replace />;
  return <Outlet />;
}

export function RequireOrgAdmin() {
  const { kind, isAdmin } = useSession();
  if (!isAdmin) return <Navigate to={`/${kind}`} replace />;
  return <Outlet />;
}
