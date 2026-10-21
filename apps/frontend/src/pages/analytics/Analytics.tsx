import { useAuth } from '../../context/AuthContext';
import PortalLayout from '../../components/PortalLayout';
import ProviderAnalytics from './ProviderAnalytics';
import DistributorAnalytics from './DistributorAnalytics';
import './Analytics.css';

export default function Analytics() {
  const { admin } = useAuth();

  if (!admin?.isActive) {
    return <PortalLayout title="Your workspace is ready" eyebrow="Verification in progress">
      <p className="portal-section-intro">Your documents are with our verification team. You can review your business profile while we complete the checks.</p>
      <section className="portal-card verification-dashboard">
        <span className="verification-dashboard-icon">✓</span>
        <div><h2>Submission received</h2><p>We’ll email you as soon as your account is approved. Plans, marketplace tools and analytics unlock automatically after verification.</p></div>
      </section>
    </PortalLayout>;
  }

  return (
    <PortalLayout title="Performance overview" eyebrow="Analytics">
      <p className="portal-section-intro">
        {admin?.partnerType === 'provider'
          ? 'A clear read on how your plans are performing across TheeInsurance.'
          : 'A live view of the insurance activity your distribution network has facilitated.'}
      </p>
        {admin?.partnerType === 'provider' ? <ProviderAnalytics /> : <DistributorAnalytics />}
    </PortalLayout>
  );
}
