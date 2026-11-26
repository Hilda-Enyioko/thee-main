import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useSession } from '../context/SessionContext';
import { label, orgName } from '../lib/format';
import type { Kind } from '../lib/session';
import type { OrgStatus } from '../lib/types';
import '../components/PortalLayout.css';
import '../styles/portal.css';

interface NavItem { to: string; label: string; end?: boolean }

function navFor(kind: Kind, status: OrgStatus | undefined, isAdmin: boolean, staffRole: string | null): NavItem[] {
  if (kind === 'staff') {
    return [
      { to: '/staff', label: 'KYC review', end: true },
      { to: '/staff/access', label: 'Access grants' },
      ...(staffRole === 'SUPER_ADMIN' ? [{ to: '/staff/accounts', label: 'Staff accounts' }] : []),
    ];
  }
  const root = `/${kind}`;
  const approved = status === 'APPROVED';
  const needsKyc = status === 'PENDING_KYC' || status === 'REJECTED';
  const items: NavItem[] = [{ to: root, label: 'Overview', end: true }];
  if (needsKyc) items.push({ to: `${root}/kyc`, label: 'Verification' });
  if (kind === 'provider' && approved) {
    items.push({ to: `${root}/products`, label: 'Products' }, { to: `${root}/access`, label: 'Access requests' });
  }
  if (kind === 'distributor') {
    items.push({ to: `${root}/catalogue`, label: 'Catalogue' });
    if (approved) items.push({ to: `${root}/access`, label: 'My requests' });
  }
  if (isAdmin) items.push({ to: `${root}/team`, label: 'Team' });
  items.push({ to: `${root}/profile`, label: 'Profile' });
  return items;
}

const KIND_LABEL: Record<Kind, string> = {
  staff: 'TheeInsurance staff',
  provider: 'Insurance provider',
  distributor: 'Distribution partner',
};

export default function PortalShell() {
  const { kind, org, viewer, isAdmin, suspended, logout } = useSession();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  if (!kind) return null;

  const items = suspended ? [] : navFor(kind, org?.status, isAdmin, viewer?.role ?? null);
  const name = kind === 'staff' ? viewer?.fullName ?? 'Staff' : org ? orgName(org) : viewer?.fullName ?? 'Your organisation';
  const sub = kind === 'staff'
    ? viewer?.role ? label(viewer.role) : KIND_LABEL.staff
    : org?.type ? `${KIND_LABEL[kind]} · ${org.type === 'DEALER_SHOP' ? 'Dealer or shop' : 'API partner'}` : KIND_LABEL[kind];

  const signOut = () => { logout(); navigate(`/${kind}/login`, { replace: true }); };

  return (
    <div className="portal-shell">
      <aside className={`portal-rail ${menuOpen ? 'open' : ''}`}>
        <NavLink className="portal-brand" to={`/${kind === 'staff' ? 'staff' : kind}`}><span>the</span>e<span>insurance</span></NavLink>
        <nav aria-label="Portal navigation" onClick={() => setMenuOpen(false)}>
          {items.map((i) => <NavLink key={i.to} to={i.to} end={i.end}>{i.label}</NavLink>)}
        </nav>
        <div className="portal-rail-foot">
          <span className="portal-status-dot" />
          {kind === 'staff' ? 'Staff console' : org ? label(org.status) : 'Partner portal'}
        </div>
      </aside>
      <main className="portal-main">
        <header className="portal-topbar">
          <button type="button" className="portal-menu-toggle" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-label="Toggle navigation">☰</button>
          <div className="portal-kind">{KIND_LABEL[kind]}</div>
          <div className="portal-user">
            <span className="portal-avatar">{name.slice(0, 1).toUpperCase()}</span>
            <div><strong>{name}</strong><small>{sub}</small></div>
            <button type="button" className="logout-btn" onClick={signOut}>Log out</button>
          </div>
        </header>
        <section className="portal-content">
          {suspended ? <SuspendedScreen /> : <Outlet />}
        </section>
      </main>
    </div>
  );
}

export function PageHeader({ eyebrow, title, actions }: { eyebrow?: string; title: string; actions?: ReactNode }) {
  return (
    <div className="ui-page-head">
      <div>
        {eyebrow ? <p className="portal-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
      </div>
      {actions ? <div className="ui-card-actions">{actions}</div> : null}
    </div>
  );
}

function SuspendedScreen() {
  return (
    <div className="ui-status-screen">
      <p className="portal-eyebrow">Organisation suspended</p>
      <h1>Access is paused</h1>
      <p>Your organisation has been suspended, so the portal is unavailable for now. Contact TheeInsurance support to find out more.</p>
      <a className="portal-button secondary" href="mailto:contact@theeinsurance.com.ng">Contact support</a>
    </div>
  );
}
