import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { setSessionKind, setTokens } from '../lib/auth';
import { useAuth } from '../context/AuthContext';
import './Onboarding.css';
import { SiteNav, SiteFooter } from '../components/SiteChrome';

type PartnerType = 'provider' | 'distributor';

interface BusinessDetails {
  name: string;
  partner_type: PartnerType;
  commission_rate: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  confirm_password: string;
}

const initialDetails: BusinessDetails = {
  name: '',
  partner_type: 'provider',
  commission_rate: '0.00',
  email: '',
  first_name: '',
  last_name: '',
  password: '',
  confirm_password: '',
};

export default function Onboarding() {
  const navigate = useNavigate();
  const { setAdmin } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [details, setDetails] = useState<BusinessDetails>(initialDetails);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [keyCopied, setKeyCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const updateField = (field: keyof BusinessDetails, value: string) => {
    setDetails((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep1 = () => {
    const nextErrors: Record<string, string> = {};
    if (!details.name.trim()) nextErrors.name = 'Enter your business name.';
    if (!details.email.trim()) nextErrors.email = 'Enter a work email.';
    if (!details.first_name.trim()) nextErrors.first_name = 'Enter a first name.';
    if (!details.last_name.trim()) nextErrors.last_name = 'Enter a last name.';
    if (details.password.length < 8) nextErrors.password = 'Password must be at least 8 characters.';
    if (details.password !== details.confirm_password) {
      nextErrors.confirm_password = 'Passwords do not match.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1()) return;

    setSubmitting(true);
    setErrors({});
    try {
      const response = await api.post('/partner/onboard/', {
        name: details.name,
        partner_type: details.partner_type,
        ...(details.partner_type === 'distributor' ? { commission_rate: details.commission_rate } : {}),
        email: details.email,
        first_name: details.first_name,
        last_name: details.last_name,
        password: details.password,
        confirm_password: details.confirm_password,
      });

      setApiKey(response.data.api_key);
      setTokens(response.data.tokens.access, response.data.tokens.refresh);
      setSessionKind('partner');
      setAdmin({
        partnerType: response.data.partner_type,
        partnerName: details.name,
        isActive: response.data.is_active,
      });
      setConfirmed(true);
      window.setTimeout(() => {
        setStep(2);
        window.setTimeout(() => navigate('/kyc', { replace: true }), 2000);
      }, 680);
    } catch (err: unknown) {
      const apiErrors = (err as { response?: { data?: unknown } }).response?.data;
      if (apiErrors && typeof apiErrors === 'object') {
        setErrors(apiErrors as Record<string, string>);
      } else {
        setErrors({ general: 'Something went wrong. Please try again.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyKey = async () => {
    await navigator.clipboard.writeText(apiKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  };

  return (
    <div className="onboarding">
      <SiteNav />

      <main className="onboarding-shell">
        <section className="onboarding-card" aria-label="Create your TheeInsurance account">
          <p className="onboarding-overline">Partner onboarding</p>
          <div className="stepper" aria-label={`Step ${step} of 2`}>
          <div className={`stepper-item ${step >= 1 ? 'active' : ''}`}>
            <span className="stepper-index">1</span>
            <span>Account details</span>
          </div>
          <div className={`stepper-line ${step >= 2 ? 'filled' : ''}`} />
          <div className={`stepper-item ${step >= 2 ? 'active' : ''}`}>
            <span className="stepper-index">2</span>
            <span>All set</span>
          </div>
        </div>

        {errors.general && <div className="form-error-banner">{errors.general}</div>}

        {step === 1 && (
          <form onSubmit={handleSubmit} className="onboarding-form">
            <h1>Tell us about your business</h1>
            <p className="form-subtext">
              This creates your partner account. You'll log in and submit verification documents next.
            </p>

            <div className="field-row">
              <label>
                Business name
                <input
                  type="text"
                  value={details.name}
                  onChange={(e) => updateField('name', e.target.value)}
                />
                {errors.name && <span className="field-error">{errors.name}</span>}
              </label>
            </div>

            <label>
              Account type
              <select
                value={details.partner_type}
                onChange={(e) => updateField('partner_type', e.target.value)}
              >
                <option value="provider">Insurance Provider</option>
                <option value="distributor">Distributor</option>
              </select>
            </label>

            {details.partner_type === 'distributor' && (
              <label>
                Commission rate (%)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={details.commission_rate}
                  onChange={(e) => updateField('commission_rate', e.target.value)}
                />
              </label>
            )}

            <div className="field-row">
              <label>
                First name
                <input
                  type="text"
                  value={details.first_name}
                  onChange={(e) => updateField('first_name', e.target.value)}
                />
                {errors.first_name && <span className="field-error">{errors.first_name}</span>}
              </label>
              <label>
                Last name
                <input
                  type="text"
                  value={details.last_name}
                  onChange={(e) => updateField('last_name', e.target.value)}
                />
                {errors.last_name && <span className="field-error">{errors.last_name}</span>}
              </label>
            </div>

            <label>
              Work email
              <input
                type="email"
                value={details.email}
                onChange={(e) => updateField('email', e.target.value)}
              />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </label>

            <div className="field-row">
              <label>
                Password
                <input
                  type="password"
                  value={details.password}
                  onChange={(e) => updateField('password', e.target.value)}
                />
                {errors.password && <span className="field-error">{errors.password}</span>}
              </label>
              <label>
                Confirm password
                <input
                  type="password"
                  value={details.confirm_password}
                  onChange={(e) => updateField('confirm_password', e.target.value)}
                />
                {errors.confirm_password && <span className="field-error">{errors.confirm_password}</span>}
              </label>
            </div>

            <button type="submit" className={`btn-primary confirm-button ${confirmed ? 'is-confirmed' : ''}`} disabled={submitting || confirmed}>
              <span className="confirm-button-label">{submitting ? 'Creating account...' : confirmed ? 'Account created' : 'Create account'}</span>
              <span className="confirm-button-check" aria-hidden="true">✓</span>
            </button>

            <p className="form-footer-link">
              Already have an account? <Link to="/login">Log in</Link>
            </p>
          </form>
        )}

        {step === 2 && (
          <div className="onboarding-success">
            <div className="verify-line" />
            <h1>Your account is created.</h1>
            <p>
              Here's your API key  -  you'll need it later for server-to-server requests once your
              account is verified. <strong>Copy it now; you won't be able to see it again.</strong>
            </p>

            <div className="api-key-box">
              <code>{apiKey}</code>
              <button type="button" className="btn-ghost" onClick={handleCopyKey}>
                {keyCopied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <p className="onboarding-next-step">Taking you to your verification workspace in a moment…</p>
          </div>
        )}
        </section>
        <aside className="onboarding-visual" aria-label="TheeInsurance partner network">
          <div className="visual-topline"><span>THEEINSURANCE</span><span>01 — 02</span></div>
          <div className="visual-copy"><p>One connected layer</p><h2>Make protection<br />move <em>further.</em></h2><span>Built for providers and distributors shaping the next era of insurance.</span></div>
          <div className="network-orbit" aria-hidden="true"><div className="orbit orbit-outer" /><div className="orbit orbit-mid" /><div className="orbit orbit-inner" /><div className="network-core"><img src="/theeinsurance-mark.jpg" alt="" /></div><i className="network-node node-a">+</i><i className="network-node node-b">↗</i><i className="network-node node-c">✓</i><i className="network-node node-d">◎</i></div>
          <div className="visual-footer"><span>Secure partner access</span><span>NG / 2026</span></div>
        </aside>
      </main>
      <SiteFooter />
    </div>
  );
}
