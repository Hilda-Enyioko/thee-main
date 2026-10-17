import { useAuth } from '../../context/AuthContext';
import PortalLayout from '../../components/PortalLayout';
import ProviderAnalytics from './ProviderAnalytics';
import DistributorAnalytics from './DistributorAnalytics';
import './Analytics.css';

export default function Analytics() {
  const { admin } = useAuth();

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
