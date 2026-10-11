import { useAuth } from '../../context/AuthContext';
import LogoutButton from '../../components/LogoutButton';
import ProviderAnalytics from './ProviderAnalytics';
import DistributorAnalytics from './DistributorAnalytics';
import './Analytics.css';

export default function Analytics() {
  const { admin } = useAuth();

  return (
    <div className="analytics-page">
      <header className="dashboard-header">
        <div className="logo">
          <span className="logo-mark">the</span>e<span className="logo-accent">insurance</span>
        </div>
        <div className="header-right">
          <span className="partner-name">{admin?.partnerName}</span>
          <LogoutButton />
        </div>
      </header>

      <div className="dashboard-body">
        <div className="dashboard-toolbar">
          <div>
            <h1>Analytics</h1>
            <p className="toolbar-subtext">
              {admin?.partnerType === 'provider'
                ? 'How your plans are performing across theeinsurance.'
                : 'What you\u2019ve facilitated through theeinsurance.'}
            </p>
          </div>
        </div>

        {admin?.partnerType === 'provider' ? <ProviderAnalytics /> : <DistributorAnalytics />}
      </div>
    </div>
  );
}
