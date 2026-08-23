import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import './Onboarding.css';
import { SiteNav, SiteFooter } from '../components/SiteChrome';

type PartnerType = 'provider' | 'distributor';

interface BusinessDetails {
  partner_name: string;
  partner_slug: string;
  partner_type: PartnerType;
  commission_rate: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  confirm_password: string;
}

const initialDetails: BusinessDetails = {
  partner_name: '',
  partner_slug: '',
  partner_type: 'provider',
  commission_rate: '0.00',
  email: '',
  first_name: '',
  last_name: '',
  password: '',
  confirm_password: '',
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [slugTouched, setSlugTouched] = useState(false);
  const [details, setDetails] = useState<BusinessDetails>(initialDetails);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [keyCopied, setKeyCopied] = useState(false);

  const updateField = (field: keyof BusinessDetails, value: string) => {
    setDetails((prev) => ({ ...prev, [field]: value }));
    if (field === 'partner_name' && !slugTouched) {
      setDetails((prev) => ({ ...prev, partner_name: value, partner_slug: slugify(value) }));
    }
  };

  const validateStep1 = () => {
    const nextErrors: Record<string, string> = {};
    if (!details.partner_name.trim()) nextErrors.partner_name = 'Enter your business name.';
    if (!details.partner_slug.trim()) nextErrors.partner_slug = 'Enter a slug for your business.';
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
        partner_name: details.partner_name,
        partner_slug: details.partner_slug,
        partner_type: details.partner_type,
        commission_rate: details.partner_type === 'distributor' ? details.commission_rate : '0.00',
        email: details.email,
        first_name: details.first_name,
        last_name: details.last_name,
        password: details.password,
        confirm_password: details.confirm_password,
      });

      setApiKey(response.data.api_key);
      setStep(2);
    } catch (err: any) {
      const apiErrors = err.response?.data;
      if (apiErrors && typeof apiErrors === 'object') {
        setErrors(apiErrors);
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

      <div className="onboarding-card">
        <div className="stepper">
          <div className={`stepper-item ${step >= 1 ? 'active' : ''}`}>
            <span className="stepper-index">01</span>
            <span>Business details</span>
          </div>
          <div className={`stepper-line ${step >= 2 ? 'filled' : ''}`} />
          <div className={`stepper-item ${step >= 2 ? 'active' : ''}`}>
            <span className="stepper-index">02</span>
            <span>Account created</span>
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
                  value={details.partner_name}
                  onChange={(e) => updateField('partner_name', e.target.value)}
                />
                {errors.partner_name && <span className="field-error">{errors.partner_name}</span>}
              </label>

              <label>
                Slug
                <input
                  type="text"
                  value={details.partner_slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    updateField('partner_slug', slugify(e.target.value));
                  }}
                />
                {errors.partner_slug && <span className="field-error">{errors.partner_slug}</span>}
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

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Creating account...' : 'Create account'}
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
              Here's your API key — you'll need it later for server-to-server requests once your
              account is verified. <strong>Copy it now; you won't be able to see it again.</strong>
            </p>

            <div className="api-key-box">
              <code>{apiKey}</code>
              <button type="button" className="btn-ghost" onClick={handleCopyKey}>
                {keyCopied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <p className="onboarding-next-step">
              Next, log in and submit your verification documents to activate your account.
            </p>

            <button className="btn-primary" onClick={() => navigate('/login')}>
              Continue to login
            </button>
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
