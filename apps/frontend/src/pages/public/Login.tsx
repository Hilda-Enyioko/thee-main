import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { errorText, isWakeError, statusOf } from '../../lib/http';
import type { Kind } from '../../lib/session';
import { SiteFooter, SiteNav } from '../../components/SiteChrome';
import '../Login.css';
import '../../styles/portal.css';

const COPY: Record<Kind, { overline: string; title: string; sub: string; index: string }> = {
  provider: { overline: 'Provider sign in', title: 'Welcome back.', sub: 'Manage your products, plans and distributor access.', index: 'Provider portal' },
  distributor: { overline: 'Distributor sign in', title: 'Welcome back.', sub: 'Browse the catalogue and manage your provider access.', index: 'Distributor portal' },
  staff: { overline: 'Staff sign in', title: 'Staff console', sub: 'Review KYC submissions, oversee access and manage staff.', index: 'TheeInsurance staff' },
};

export default function Login({ kind }: { kind: Kind }) {
  const session = useSession();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const [busy, setBusy] = useState(false);
  const [waking, setWaking] = useState(false);
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const from = (location.state as { from?: string } | null)?.from;
  if (session.phase === 'ready' && session.kind) {
    return <Navigate to={from?.startsWith(`/${session.kind}`) ? from : `/${session.kind}`} replace />;
  }
  const copy = COPY[kind];

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    setBusy(true);
    setError(null);
    setCanRetry(false);
    // A sleeping server takes a while; tell the user instead of looking stuck.
    timer.current = window.setTimeout(() => setWaking(true), 4000);
    try {
      // The redirect above runs once the session is ready.
      await session.login(kind, email.trim(), password);
    } catch (err) {
      const status = statusOf(err);
      if (status === 401) setError('Incorrect email or password.');
      else if (status === 403) setError(errorText(err, 'This account cannot sign in right now.'));
      else { setError(errorText(err)); setCanRetry(isWakeError(err)); }
    } finally {
      window.clearTimeout(timer.current);
      setWaking(false);
      setBusy(false);
    }
  };

  const staff = kind === 'staff';
  const notice = session.notice;

  const form = (
    <div className="login-card auth-card">
      <p className="onboarding-overline">{copy.overline}</p>
      <h1>{copy.title}</h1>
      <p className="form-subtext">{copy.sub}</p>

      {notice && !error ? <div className="form-info-banner">{notice}</div> : null}
      {error ? (
        <div className="form-error-banner" role="alert">
          {error}
          {canRetry ? <button type="button" className="link-button" onClick={() => submit()}>Try again</button> : null}
        </div>
      ) : null}
      {waking ? <div className="form-info-banner">Waking the server up. This can take up to a minute on the first try.</div> : null}

      <form onSubmit={submit} className="login-form" noValidate>
        <label>Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>
        <label>Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>

      {staff ? (
        <p className="form-footer-link">Not staff? <Link to="/login">Partner sign in</Link></p>
      ) : (
        <>
          <p className="form-footer-link">
            New here? <Link to={`/onboard/${kind}`}>Register as a {kind}</Link>
          </p>
          <p className="form-footer-link portal-switch">
            {kind === 'provider' ? <Link to="/distributor/login">Distributor sign in</Link> : <Link to="/provider/login">Provider sign in</Link>}
          </p>
        </>
      )}
    </div>
  );

  if (staff) {
    return (
      <div className="login-page auth-page staff-auth-page">
        <nav className="staff-auth-nav"><Link to="/"><span>the</span>einsurance</Link><small>Internal access</small></nav>
        <main className="auth-shell">
          <aside className="staff-auth-aside">
            <span>{copy.index}</span>
            <h2>Keep the network<br /><em>trustworthy.</em></h2>
            <p>Every KYC decision and document view is written to the audit log.</p>
          </aside>
          {form}
        </main>
      </div>
    );
  }

  return (
    <div className="login-page auth-page">
      <SiteNav />
      <main className="auth-shell">
        <section className="auth-intro" aria-hidden="true">
          <span className="auth-index">{copy.index}</span>
          <div><p>Welcome to</p><h2>Insurance that<br /><em>moves with you.</em></h2></div>
          <div className="auth-orbit"><i /><i /><i /><b>✦</b></div>
          <small>Secure access for providers and distributors</small>
        </section>
        {form}
      </main>
      <SiteFooter />
    </div>
  );
}
