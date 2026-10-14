import { useEffect, useState } from 'react';
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
  const [kycStatus, setKycStatus] = useState<{status:string;review_note?:string} | null>(null);

  useEffect(() => {
    api.get('/partner/kyc/').then((r) => setKycStatus(r.data)).catch(() => undefined);
  }, []);

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!rcNumber.trim()) nextErrors.rc_number = 'Enter your RC number.';
    if (!tin.trim()) nextErrors.tax_identification_number = 'Enter your tax identification number.';
    if (!cacCertificate) nextErrors.cac_certificate = 'Upload your CAC certificate.';
    if (!proofOfAddress) nextErrors.proof_of_address = 'Upload proof of address.';
    if (admin?.partnerType === 'provider' && !naicomNumber.trim()) {
      nextErrors.naicom_licence_number = 'Enter your NAICOM licence number.';
    }
    if (admin?.partnerType === 'provider' && !naicomDoc) {
      nextErrors.naicom_licence_doc = 'Upload your NAICOM licence document.';
    }
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
        {submitted || (kycStatus && kycStatus.status !== 'rejected') ? (
          <div className="onboarding-success">
            <div className="verify-line" />
            <h1>{kycStatus?.status === 'approved' ? 'Your business is verified.' : 'Documents submitted.'}</h1>
            <p>
              {kycStatus?.status === 'approved' ? 'Your account and API key are active.' : <>Our team is reviewing your verification for <strong>{admin?.partnerName}</strong>. We'll notify you once your account is approved and your API key is active.</>}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="onboarding-form" encType="multipart/form-data">
            <h1>{kycStatus?.status === 'rejected' ? 'Update and resubmit your verification' : 'Verify your business'}</h1>
            <p className="form-subtext">
              Submit these documents to activate your account and your API key. This usually takes 1–2 business days.
            </p>

            {errors.general && <div className="form-error-banner">{errors.general}</div>}
            {kycStatus?.review_note && <div className="form-error-banner">Review note: {kycStatus.review_note}</div>}

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
              NAICOM licence number {admin?.partnerType !== 'provider' && <span className="optional-tag">optional</span>}
              <input type="text" value={naicomNumber} onChange={(e) => setNaicomNumber(e.target.value)} />
              {errors.naicom_licence_number && <span className="field-error">{errors.naicom_licence_number}</span>}
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
              NAICOM licence document {admin?.partnerType !== 'provider' && <span className="optional-tag">optional</span>}
              <div className="file-drop">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setNaicomDoc(e.target.files?.[0] ?? null)}
                />
                <span>{naicomDoc ? naicomDoc.name : 'Choose file'}</span>
              </div>
              {errors.naicom_licence_doc && <span className="field-error">{errors.naicom_licence_doc}</span>}
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
