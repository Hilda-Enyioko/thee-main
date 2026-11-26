import { Link } from 'react-router-dom';
import { SiteFooter, SiteNav } from '../../components/SiteChrome';
import '../Login.css';
import '../../styles/portal.css';

// /login and /onboard: pick the portal first, since each has its own login.
export default function PortalChooser({ mode }: { mode: 'login' | 'onboard' }) {
  const signIn = mode === 'login';
  const options = [
    { kind: 'provider', title: 'Insurance provider', text: 'Publish Motor and Gadget products and approve the distributors who sell them.' },
    { kind: 'distributor', title: 'Distributor', text: 'Dealers, shops, banks and fintechs offering cover to their customers.' },
  ];
  return (
    <div className="login-page auth-page">
      <SiteNav />
      <main className="chooser">
        <p className="onboarding-overline">{signIn ? 'Sign in' : 'Create an account'}</p>
        <h1>{signIn ? 'Which portal are you signing in to?' : 'How will you work with TheeInsurance?'}</h1>
        <div className="chooser-grid">
          {options.map((o) => (
            <Link key={o.kind} to={signIn ? `/${o.kind}/login` : `/onboard/${o.kind}`} className="chooser-card">
              <strong>{o.title}</strong>
              <span>{o.text}</span>
              <em>{signIn ? 'Sign in' : 'Get started'} ↗</em>
            </Link>
          ))}
        </div>
        <p className="form-footer-link">
          {signIn ? <>New to TheeInsurance? <Link to="/onboard">Create an account</Link></> : <>Already registered? <Link to="/login">Sign in</Link></>}
          {signIn ? <> · <Link to="/staff/login">Staff</Link></> : null}
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
