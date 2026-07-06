import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import LogoutButton from '../../components/LogoutButton';
import './AccessRequests.css';

type AccessStatus = 'not_requested' | 'pending' | 'approved' | 'rejected';

interface AccessEntry {
  id: string;
  provider: string;
  provider_name: string;
  status: AccessStatus;
  is_active: boolean;
  granted_at: string;
}

interface BrowseProvider {
  id: string;
  name: string;
  slug: string;
  access_status: AccessStatus;
}

interface BrowsePlan {
  id: string;
  name: string;
  provider: string;
  provider_name: string;
  category_name: string;
  coverage_level: string;
  coverage_amount: string;
  premium: string;
  duration_months: number;
  description: string;
  access_status: AccessStatus;
}

type Tab = 'my_providers' | 'browse_providers' | 'browse_plans';

const STATUS_LABEL: Record<AccessStatus, string> = {
  not_requested: 'Not requested',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

export default function AccessRequests() {
  const { admin } = useAuth();
  const [tab, setTab] = useState<Tab>('my_providers');

  const [myProviders, setMyProviders] = useState<AccessEntry[]>([]);
  const [browseProviders, setBrowseProviders] = useState<BrowseProvider[]>([]);
  const [browsePlans, setBrowsePlans] = useState<BrowsePlan[]>([]);
  const [providerFilter, setProviderFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchMyProviders = async () => {
    const res = await api.get('/partner/providers/');
    setMyProviders(res.data.providers);
  };

  const fetchBrowseProviders = async () => {
    const res = await api.get('/partner/providers/browse/');
    setBrowseProviders(res.data);
  };

  const fetchBrowsePlans = async (providerId?: string) => {
    const params = providerId ? { provider: providerId } : {};
    const res = await api.get('/partner/providers/plans/', { params });
    setBrowsePlans(res.data);
  };

  const loadTab = async (nextTab: Tab) => {
    setLoading(true);
    try {
      if (nextTab === 'my_providers') await fetchMyProviders();
      if (nextTab === 'browse_providers') await fetchBrowseProviders();
      if (nextTab === 'browse_plans') await fetchBrowsePlans(providerFilter || undefined);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTab(tab);
  }, [tab]);

  useEffect(() => {
    if (tab === 'browse_plans') fetchBrowsePlans(providerFilter || undefined);
  }, [providerFilter]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleRequestAccess = async (providerId: string) => {
    setRequestingId(providerId);
    try {
      await api.post('/partner/providers/request-access/', { provider: providerId });
      showToast('Access requested. We\u2019ll notify you once the provider reviews it.');
      await fetchBrowseProviders();
      if (tab === 'browse_plans') await fetchBrowsePlans(providerFilter || undefined);
    } catch (err: any) {
      const message =
        err.response?.data?.provider?.[0] ||
        err.response?.data?.error ||
        'Could not send the request. Please try again.';
      showToast(message);
    } finally {
      setRequestingId(null);
    }
  };

  return (
    <div className="access-page">
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
            <h1>Provider Access</h1>
            <p className="toolbar-subtext">Request access to a provider's plans to sell them on your platform.</p>
          </div>
        </div>

        <div className="filter-tabs">
          <button className={`filter-tab ${tab === 'my_providers' ? 'active' : ''}`} onClick={() => setTab('my_providers')}>
            My Providers
          </button>
          <button className={`filter-tab ${tab === 'browse_providers' ? 'active' : ''}`} onClick={() => setTab('browse_providers')}>
            Browse Providers
          </button>
          <button className={`filter-tab ${tab === 'browse_plans' ? 'active' : ''}`} onClick={() => setTab('browse_plans')}>
            Browse Plans
          </button>
        </div>

        {toast && <div className="toast">{toast}</div>}

        {loading ? (
          <div className="empty-state">Loading...</div>
        ) : (
          <>
            {tab === 'my_providers' && (
              myProviders.length === 0 ? (
                <div className="empty-state">
                  <p>You haven't requested access to any providers yet.</p>
                  <button className="btn-primary" onClick={() => setTab('browse_providers')}>Browse providers</button>
                </div>
              ) : (
                <div className="access-grid">
                  {myProviders.map((entry) => (
                    <div className="access-card" key={entry.id}>
                      <div className="access-card-top">
                        <h3>{entry.provider_name}</h3>
                        <span className={`status-pill status-${entry.status}`}>{STATUS_LABEL[entry.status]}</span>
                      </div>
                      <p className="access-meta">Requested {new Date(entry.granted_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )
            )}

            {tab === 'browse_providers' && (
              <div className="access-grid">
                {browseProviders.map((p) => (
                  <div className="access-card" key={p.id}>
                    <div className="access-card-top">
                      <h3>{p.name}</h3>
                      <span className={`status-pill status-${p.access_status}`}>{STATUS_LABEL[p.access_status]}</span>
                    </div>
                    <div className="access-card-actions">
                      {p.access_status === 'not_requested' && (
                        <button
                          className="btn-primary"
                          disabled={requestingId === p.id}
                          onClick={() => handleRequestAccess(p.id)}
                        >
                          {requestingId === p.id ? 'Requesting...' : 'Request access'}
                        </button>
                      )}
                      {p.access_status === 'rejected' && (
                        <button
                          className="btn-ghost"
                          disabled={requestingId === p.id}
                          onClick={() => handleRequestAccess(p.id)}
                        >
                          {requestingId === p.id ? 'Requesting...' : 'Request again'}
                        </button>
                      )}
                      <button
                        className="btn-ghost"
                        onClick={() => {
                          setProviderFilter(p.id);
                          setTab('browse_plans');
                        }}
                      >
                        View plans
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'browse_plans' && (
              <>
                {providerFilter && (
                  <div className="active-filter">
                    Filtering by provider
                    <button onClick={() => setProviderFilter('')}>Clear</button>
                  </div>
                )}
                <div className="plan-grid">
                  {browsePlans.map((plan) => (
                    <div className="plan-card" key={plan.id}>
                      <div className="plan-card-top">
                        <span className={`status-pill status-${plan.access_status}`}>{STATUS_LABEL[plan.access_status]}</span>
                        <span className="category-pill">{plan.category_name}</span>
                      </div>
                      <h3>{plan.name}</h3>
                      <p className="access-meta">{plan.provider_name}</p>
                      <p className="plan-description">{plan.description}</p>
                      <div className="plan-figures">
                        <div>
                          <span className="figure-label">Premium</span>
                          <span className="figure-value">₦{Number(plan.premium).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="figure-label">Coverage</span>
                          <span className="figure-value">₦{Number(plan.coverage_amount).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="figure-label">Duration</span>
                          <span className="figure-value">{plan.duration_months} mo</span>
                        </div>
                      </div>
                      {plan.access_status === 'not_requested' && (
                        <button
                          className="btn-primary"
                          disabled={requestingId === plan.provider}
                          onClick={() => handleRequestAccess(plan.provider)}
                        >
                          {requestingId === plan.provider ? 'Requesting...' : 'Request access to sell this'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
