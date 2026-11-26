import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { orgApi, type OrgKind } from '../../lib/api';
import { errorText } from '../../lib/http';
import { useSession } from '../../context/SessionContext';
import type { DistributorType, OnboardBody } from '../../lib/types';
import { SiteFooter, SiteNav } from '../../components/SiteChrome';
import '../Onboarding.css';
import '../../styles/portal.css';

interface Form {
  legalName: string; tradingName: string; rcNumber: string; email: string; phone: string; address: string;
  type: DistributorType; city: string;
  fullName: string; adminEmail: string; password: string; confirm: string;
}

const empty: Form = {
  legalName: '', tradingName: '', rcNumber: '', email: '', phone: '', address: '',
  type: 'DEALER_SHOP', city: '', fullName: '', adminEmail: '', password: '', confirm: '',
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mirrors the server's limits so problems show before the request is sent.
function validate(f: Form, kind: OrgKind): Partial<Record<keyof Form, string>> {
  const e: Partial<Record<keyof Form, string>> = {};
  const len = (v: string, min: number, max: number) => v.trim().length >= min && v.trim().length <= max;
  if (!len(f.legalName, 2, 200)) e.legalName = 'Enter the registered name (2–200 characters).';
  if (f.tradingName.length > 200) e.tradingName = 'Keep this under 200 characters.';
  if (!len(f.rcNumber, 3, 30)) e.rcNumber = 'Enter your RC number (3–30 characters).';
  if (!EMAIL.test(f.email.trim())) e.email = 'Enter a valid business email.';
  if (!len(f.phone, 7, 20)) e.phone = 'Enter a phone number (7–20 characters).';
  if (f.address.length > 300) e.address = 'Keep the address under 300 characters.';
  if (kind === 'distributor' && f.city.length > 100) e.city = 'Keep this under 100 characters.';
  if (!len(f.fullName, 2, 120)) e.fullName = 'Enter your full name.';
  if (!EMAIL.test(f.adminEmail.trim())) e.adminEmail = 'Enter a valid email for your login.';
  if (f.password.length < 10 || f.password.length > 128) e.password = 'Use 10 to 128 characters.';
  if (f.password !== f.confirm) e.confirm = 'Passwords do not match.';
  return e;
}

export default function Onboard({ kind }: { kind: OrgKind }) {
  const navigate = useNavigate();
  const { login } = useSession();
  const [f, setF] = useState<Form>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof Form) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || done) return;
    const errs = validate(f, kind);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const body: OnboardBody = {
      legalName: f.legalName.trim(),
      rcNumber: f.rcNumber.trim(),
      email: f.email.trim(),
      phone: f.phone.trim(),
      admin: { fullName: f.fullName.trim(), email: f.adminEmail.trim(), password: f.password },
      ...(f.tradingName.trim() ? { tradingName: f.tradingName.trim() } : {}),
      ...(f.address.trim() ? { address: f.address.trim() } : {}),
      ...(kind === 'distributor' ? { type: f.type, ...(f.city.trim() ? { city: f.city.trim() } : {}) } : {}),
    };

    setBusy(true);
    setBanner(null);
    try {
      await orgApi.onboard(kind, body);
      setDone(true);
      // Sign straight in with the new admin login; fall back to the login page.
      try {
        await login(kind, body.admin.email, body.admin.password);
        navigate(`/${kind}/kyc`, { replace: true });
      } catch {
        navigate(`/${kind}/login`, { replace: true });
      }
    } catch (err) {
      setBanner(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const err = (k: keyof Form) => (errors[k] ? <span className="field-error">{errors[k]}</span> : null);
  const title = kind === 'provider' ? 'Register your insurance company' : 'Register your business';

  return (
    <div className="onboarding">
      <SiteNav />
      <main className="onboarding-shell">
        <section className="onboarding-card" aria-label={title}>
          <p className="onboarding-overline">{kind === 'provider' ? 'Provider onboarding' : 'Distributor onboarding'}</p>
          <form onSubmit={submit} className="onboarding-form" noValidate>
            <h1>{title}</h1>
            <p className="form-subtext">
              This creates your organisation and its first admin login. You will upload verification documents next.
            </p>
            {banner ? <div className="form-error-banner" role="alert">{banner}</div> : null}

            {kind === 'distributor' && (
              <fieldset className="type-choice">
                <legend>What kind of distributor are you?</legend>
                <label className={f.type === 'DEALER_SHOP' ? 'selected' : ''}>
                  <input type="radio" name="type" value="DEALER_SHOP" checked={f.type === 'DEALER_SHOP'} onChange={set('type')} />
                  <strong>Dealer or shop</strong>
                  <small>Your staff sell cover to walk-in customers from a dashboard.</small>
                </label>
                <label className={f.type === 'API_PARTNER' ? 'selected' : ''}>
                  <input type="radio" name="type" value="API_PARTNER" checked={f.type === 'API_PARTNER'} onChange={set('type')} />
                  <strong>API partner</strong>
                  <small>A bank, fintech or platform selling cover through our API.</small>
                </label>
              </fieldset>
            )}

            <label>Registered business name<input value={f.legalName} onChange={set('legalName')} maxLength={200} />{err('legalName')}</label>
            <div className="field-row">
              <label>Trading name (optional)<input value={f.tradingName} onChange={set('tradingName')} maxLength={200} />{err('tradingName')}</label>
              <label>RC number<input value={f.rcNumber} onChange={set('rcNumber')} maxLength={30} placeholder="RC123456" />{err('rcNumber')}</label>
            </div>
            <div className="field-row">
              <label>Business email<input type="email" value={f.email} onChange={set('email')} />{err('email')}</label>
              <label>Phone<input type="tel" value={f.phone} onChange={set('phone')} maxLength={20} placeholder="08012345678" />{err('phone')}</label>
            </div>
            <div className={kind === 'distributor' ? 'field-row' : ''}>
              <label>Address (optional)<input value={f.address} onChange={set('address')} maxLength={300} />{err('address')}</label>
              {kind === 'distributor' && <label>City (optional)<input value={f.city} onChange={set('city')} maxLength={100} placeholder="Lagos" />{err('city')}</label>}
            </div>

            <p className="form-section-label">Your admin login</p>
            <div className="field-row">
              <label>Full name<input value={f.fullName} onChange={set('fullName')} maxLength={120} autoComplete="name" />{err('fullName')}</label>
              <label>Login email<input type="email" value={f.adminEmail} onChange={set('adminEmail')} autoComplete="email" />{err('adminEmail')}</label>
            </div>
            <div className="field-row">
              <label>Password<input type="password" value={f.password} onChange={set('password')} maxLength={128} autoComplete="new-password" />{err('password') ?? <span className="field-hint">At least 10 characters</span>}</label>
              <label>Confirm password<input type="password" value={f.confirm} onChange={set('confirm')} maxLength={128} autoComplete="new-password" />{err('confirm')}</label>
            </div>

            <button type="submit" className={`btn-primary confirm-button ${done ? 'is-confirmed' : ''}`} disabled={busy || done}>
              <span className="confirm-button-label">{done ? 'Account created' : busy ? 'Creating account…' : 'Create account'}</span>
              <span className="confirm-button-check" aria-hidden="true">✓</span>
            </button>
            <p className="form-footer-link">
              Already registered? <Link to={`/${kind}/login`}>Sign in</Link> ·{' '}
              {kind === 'provider' ? <Link to="/onboard/distributor">I'm a distributor</Link> : <Link to="/onboard/provider">I'm a provider</Link>}
            </p>
          </form>
        </section>
        <aside className="onboarding-visual" aria-hidden="true">
          <div className="visual-topline"><span>THEEINSURANCE</span><span>{kind === 'provider' ? 'PROVIDER' : 'DISTRIBUTOR'}</span></div>
          <div className="visual-copy"><p>One connected layer</p><h2>Make protection<br />move <em>further.</em></h2><span>Register, verify your business, then start working with the network.</span></div>
          <div className="network-orbit"><div className="orbit orbit-outer" /><div className="orbit orbit-mid" /><div className="orbit orbit-inner" /><div className="network-core"><img src="/theeinsurance-mark.jpg" alt="" /></div><i className="network-node node-a">+</i><i className="network-node node-b">↗</i><i className="network-node node-c">✓</i><i className="network-node node-d">◎</i></div>
          <div className="visual-footer"><span>Secure partner access</span><span>NG / 2026</span></div>
        </aside>
      </main>
      <SiteFooter />
    </div>
  );
}
