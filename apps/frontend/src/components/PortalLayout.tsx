import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LogoutButton from './LogoutButton';
import './PortalLayout.css';

type Props = { title: string; eyebrow?: string; children: React.ReactNode };

export default function PortalLayout({ title, eyebrow = 'Partner portal', children }: Props) {
  const { admin } = useAuth();
  const provider = admin?.partnerType === 'provider';
  return <div className="portal-shell">
    <aside className="portal-rail">
      <NavLink className="portal-brand" to="/analytics"><span>the</span>e<span>insurance</span></NavLink>
      <nav aria-label="Portal navigation">
        <NavLink to="/analytics">Overview</NavLink>
        {!admin?.isActive && <NavLink to="/kyc">Verification</NavLink>}
        {admin?.isActive && <>
          {provider ? <NavLink to="/plans">Plans</NavLink> : <NavLink to="/access-requests">Marketplace</NavLink>}
          {provider && <NavLink to="/access-inbox">Access inbox</NavLink>}
          {provider && <NavLink to="/claims">Claims</NavLink>}
          <NavLink to="/subscriptions">Subscriptions</NavLink>
        </>}
        <NavLink to="/profile">Profile</NavLink>
      </nav>
      <div className="portal-rail-foot"><span className="portal-status-dot" /> Secure partner access</div>
    </aside>
    <main className="portal-main">
      <header className="portal-topbar">
        <div className="portal-search">Search your workspace <span>⌕</span></div>
        <div className="portal-user"><span className="portal-avatar">{admin?.partnerName?.slice(0, 1) ?? 'T'}</span><div><strong>{admin?.partnerName}</strong><small>{provider ? 'Insurance provider' : 'Distribution partner'}</small></div><LogoutButton /></div>
      </header>
      <section className="portal-content"><p className="portal-eyebrow">{eyebrow}</p><h1>{title}</h1>{children}</section>
    </main>
  </div>;
}
