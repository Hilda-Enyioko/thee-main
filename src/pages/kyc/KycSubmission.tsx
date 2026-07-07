import { useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import LogoutButton from '../../components/LogoutButton';
import './KycSubmission.css';

export default function KycSubmission() {
  const { admin } = useAuth();
  const [rcNumber, setRcNumber] = useState('');
  const [naicomNumber, setNaicomNumber] = useState('');
  const [tin, setTin] = useState('');
  const [cacCertificate, setCacCertificate] = useState<File | null>(null);
  const [naicomDoc, setNaicomDoc] = useState<File | null>(null);
  const [proofOfAddress, setProofOfAddress] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!rcNumber.trim()) nextErrors.rc_number = 'Enter your RC number.';
    if (!tin.trim()) nextErrors.tax_identification_number = 'Enter your tax identification number.';
    if (!cacCertificate) nextErrors.cac_certificate = 'Upload your CAC certificate.';
    if (!proofOfAddress) nextErrors.proof_of_address = 'Upload proof of address.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

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
      setSubmitted(true);
    } catch (err: any) {
      const apiErrors = err.response?.data;
      if (apiErrors && typeof apiErrors === 'object') {
        setErrors(apiErrors);
      } else {
        setErrors({ general: 'Upload failed. Please check your files and try again.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="kyc-page">
      <header className="dashboard-header">
        <div className="logo">
          <span className="logo-mark">the</span>e<span className="logo-accent">insurance</span>
        </div>
        <div className="header-right">
          <span className="partner-name">{admin?.partnerName}</span>
          <LogoutButton />
        </div>
      </header>

      <div className="kyc-card">
        {submitted ? (
          <div className="onboarding-success">
            <div className="verify-line" />
            <h1>Documents submitted.</h1>
            <p>
              Our team is reviewing your verification for <strong>{admin?.partnerName}</strong>.
              We'll notify you once your account is approved and your API key is active.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="onboarding-form" encType="multipart/form-data">
            <h1>Verify your business</h1>
            <p className="form-subtext">
              Submit these documents to activate your account and your API key. This usually takes 1–2 business days.
            </p>

            {errors.general && <div className="form-error-banner">{errors.general}</div>}

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

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Uploading...' : 'Submit for review'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
