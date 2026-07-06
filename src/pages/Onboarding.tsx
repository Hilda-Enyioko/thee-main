import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { setTokens } from '../lib/auth';
import './Onboarding.css';

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

// Minimal shape of an Axios error response for type-safe casting
interface AxiosErrorResponse {
  response?: {
    data?: Record<string, string> | string;
  };
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
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [slugTouched, setSlugTouched] = useState(false);
  const [details, setDetails] = useState<BusinessDetails>(initialDetails);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [rcNumber, setRcNumber] = useState('');
  const [naicomNumber, setNaicomNumber] = useState('');
  const [tin, setTin] = useState('');
  const [cacCertificate, setCacCertificate] = useState<File | null>(null);
  const [naicomDoc, setNaicomDoc] = useState<File | null>(null);
  const [proofOfAddress, setProofOfAddress] = useState<File | null>(null);

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

  const validateStep2 = () => {
    const nextErrors: Record<string, string> = {};
    if (!rcNumber.trim()) nextErrors.rc_number = 'Enter your RC number.';
    if (!tin.trim()) nextErrors.tax_identification_number = 'Enter your tax identification number.';
    if (!cacCertificate) nextErrors.cac_certificate = 'Upload your CAC certificate.';
    if (!proofOfAddress) nextErrors.proof_of_address = 'Upload proof of address.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
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

      if (response.data.access && response.data.refresh) {
        setTokens(response.data.access, response.data.refresh);
      }

      setStep(2);
    } catch (err: unknown) {
      const apiError = err as AxiosErrorResponse;
      const apiErrors = apiError.response?.data;
      if (apiErrors && typeof apiErrors === 'object') {
        setErrors(apiErrors as Record<string, string>);
      } else {
        setErrors({ general: 'Something went wrong. Please try again.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) return;

    setSubmitting(true);
    setErrors({});
    try {
      const formData = new FormData();
      formData.append('rc_number', rcNumber);
      if (naicomNumber) formData.append('naicom_licence_number', naicomNumber);
      formData.append('tax_identification_number', tin);
      formData.append('cac_certificate', cacCertificate as File);
      if (naicomDoc) formData.append('naicom_licence_doc', naicomDoc);
      formData.append('proof_of_address', proofOfAddress as File);

      await api.post('/partner/kyc/', formData);

      setStep(3);
    } catch (err: unknown) {
      const apiError = err as AxiosErrorResponse;
      const apiErrors = apiError.response?.data;
      if (apiErrors && typeof apiErrors === 'object') {
        setErrors(apiErrors as Record<string, string>);
      } else {
        setErrors({ general: 'Upload failed. Please check your files and try again.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="onboarding">
      <nav className="onboarding-nav">
        <Link to="/" className="logo">
          <span className="logo-mark">the</span>e<span className="logo-accent">insurance</span>
        </Link>
      </nav>

      <div className="onboarding-card">
        <div className="stepper">
          <div className={`stepper-item ${step >= 1 ? 'active' : ''}`}>
            <span className="stepper-index">01</span>
            <span>Business details</span>
          </div>
          <div className={`stepper-line ${step >= 2 ? 'filled' : ''}`} />
          <div className={`stepper-item ${step >= 2 ? 'active' : ''}`}>
            <span className="stepper-index">02</span>
            <span>Verification</span>
          </div>
          <div className={`stepper-line ${step >= 3 ? 'filled' : ''}`} />
          <div className={`stepper-item ${step >= 3 ? 'active' : ''}`}>
            <span className="stepper-index">03</span>
            <span>Submitted</span>
          </div>
        </div>

        {errors.general && <div className="form-error-banner">{errors.general}</div>}

        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="onboarding-form">
            <h1>Tell us about your business</h1>
            <p className="form-subtext">This creates your partner account. You'll verify your business next.</p>

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
              {submitting ? 'Creating account...' : 'Continue to verification'}
            </button>

            <p className="form-footer-link">
              Already have an account? <Link to="/login">Log in</Link>
            </p>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="onboarding-form" encType="multipart/form-data">
            <h1>Verify your business</h1>
            <p className="form-subtext">
              Our team reviews these documents before your account can go live. This usually takes 1–2 business days.
            </p>

            <div className="field-row">
              <label>
                RC number
                <input type="text" value={rcNumber} onChange={(e) => setRcNumber(e.target.value)} />
                {errors.rc_number && <span className="field-error">{errors.rc_number}</span>}
              </label>
              <label>
                Tax identification number
                <input type="text" value={tin} onChange={(e) => setTin(e.target.value)} />
                {errors.tax_identification_number && (
                  <span className="field-error">{errors.tax_identification_number}</span>
                )}
              </label>
            </div>

            <label>
              NAICOM licence number <span className="optional-tag">optional</span>
              <input type="text" value={naicomNumber} onChange={(e) => setNaicomNumber(e.target.value)} />
            </label>

            <label className="file-label">
              CAC certificate
              <div className="file-drop">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setCacCertificate(e.target.files?.[0] ?? null)}
                />
                <span>{cacCertificate ? cacCertificate.name : 'Choose file'}</span>
              </div>
              {errors.cac_certificate && <span className="field-error">{errors.cac_certificate}</span>}
            </label>

            <label className="file-label">
              NAICOM licence document <span className="optional-tag">optional</span>
              <div className="file-drop">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setNaicomDoc(e.target.files?.[0] ?? null)}
                />
                <span>{naicomDoc ? naicomDoc.name : 'Choose file'}</span>
              </div>
            </label>

            <label className="file-label">
              Proof of address
              <div className="file-drop">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setProofOfAddress(e.target.files?.[0] ?? null)}
                />
                <span>{proofOfAddress ? proofOfAddress.name : 'Choose file'}</span>
              </div>
              {errors.proof_of_address && <span className="field-error">{errors.proof_of_address}</span>}
            </label>

            <div className="step-actions">
              <button type="button" className="btn-ghost" onClick={() => setStep(1)}>
                Back
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Uploading...' : 'Submit for review'}
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <div className="onboarding-success">
            <div className="verify-line" />
            <h1>You're all set.</h1>
            <p>
              Your documents are with our team for review. We'll notify you at{' '}
              <strong>{details.email}</strong> once your account is verified and ready to use.
            </p>
            <button className="btn-primary" onClick={() => navigate('/login')}>
              Go to login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
