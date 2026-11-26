import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrgKind, useSession } from '../../context/SessionContext';
import { distributorApi, providerApi } from '../../lib/api';
import { errorText } from '../../lib/http';
import { dateTime, label, orgName } from '../../lib/format';
import { useLoad } from '../../lib/useLoad';
import { PageHeader } from '../../components/PortalShell';
import { Banner, Button, Card, Loading, Pill } from '../../components/ui';

export default function Overview() {
  const kind = useOrgKind();
  const { org } = useSession();
  if (!org) return <Loading />;
  if (org.status === 'APPROVED') return kind === 'provider' ? <ProviderDashboard /> : <DistributorDashboard />;
  return <StatusScreen />;
}

function StatusScreen() {
  const kind = useOrgKind();
  const { org, isAdmin, reloadOrg } = useSession();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!org) return null;

  const check = async () => {
    setChecking(true);
    setError(null);
    try { await reloadOrg(); } catch (e) { setError(errorText(e)); } finally { setChecking(false); }
  };

  if (org.status === 'UNDER_REVIEW') {
    return (
      <div className="ui-status-screen">
        <p className="portal-eyebrow">Verification</p>
        <h1>Your documents are under review</h1>
        <p>TheeInsurance staff are checking your KYC submission. Nothing else is needed from you right now. Your workspace opens as soon as you are approved.</p>
        <div className="portal-actions">
          <Button variant="secondary" busy={checking} onClick={check}>Check status</Button>
          <Pill value="UNDER_REVIEW" />
        </div>
        {error ? <Banner tone="error">{error}</Banner> : null}
      </div>
    );
  }

  const rejected = org.status === 'REJECTED';
  return (
    <div className="ui-status-screen">
      <p className="portal-eyebrow">Welcome, {orgName(org)}</p>
      <h1>{rejected ? 'Your verification needs another look' : 'Verify your business to get started'}</h1>
      {rejected ? (
        <>
          <Banner tone="warn">
            <strong>Reviewer note:</strong> {org.latestKyc?.reviewNote ?? 'No note was given.'}
            {org.latestKyc?.reviewedAt ? <> · {dateTime(org.latestKyc.reviewedAt)}</> : null}
          </Banner>
          <p>Fix the issue above and upload new documents to submit again.</p>
        </>
      ) : (
        <p>
          Upload your CAC certificate and supporting documents. Once TheeInsurance approves them, you can
          {kind === 'provider' ? ' publish products and approve distributors.' : ' request access to providers’ products.'}
        </p>
      )}
      {isAdmin
        ? <Link className="portal-button" to={`/${kind}/kyc`}>{rejected ? 'Resubmit KYC' : 'Start verification'}</Link>
        : <Banner tone="info">Only an admin in your organisation can submit KYC.</Banner>}
    </div>
  );
}

function Stat({ label: l, value, to }: { label: string; value: number | string; to?: string }) {
  const body = <><span>{l}</span><strong>{value}</strong></>;
  return to ? <Link className="ui-stat" to={to}>{body}</Link> : <div className="ui-stat">{body}</div>;
}

function NextSteps({ steps }: { steps: { done: boolean; text: string; to: string }[] }) {
  if (steps.every((s) => s.done)) return null;
  return (
    <Card title="Next steps">
      <ol className="ui-steps">
        {steps.map((s) => (
          <li key={s.text} className={s.done ? 'done' : ''}>
            <span aria-hidden="true">{s.done ? '✓' : ''}</span>
            {s.done ? s.text : <Link to={s.to}>{s.text}</Link>}
          </li>
        ))}
      </ol>
    </Card>
  );
}

function ProviderDashboard() {
  const { org, isAdmin } = useSession();
  const products = useLoad(() => providerApi.products(), []);
  const pending = useLoad(() => providerApi.accessRequests({ status: 'PENDING', limit: 1 }), []);
  const approved = useLoad(() => providerApi.accessRequests({ status: 'APPROVED', limit: 1 }), []);
  if (!org) return null;
  const list = products.data ?? [];
  const active = list.filter((p) => p.status === 'ACTIVE').length;

  return (
    <>
      <PageHeader eyebrow="Provider overview" title={orgName(org)} />
      {products.error ? <Banner tone="error">{products.error}</Banner> : null}
      <div className="ui-stats">
        <Stat label="Active products" value={products.loading ? '…' : active} to="/provider/products" />
        <Stat label="Draft products" value={products.loading ? '…' : list.filter((p) => p.status === 'DRAFT').length} to="/provider/products" />
        <Stat label="Pending access requests" value={pending.data?.total ?? '…'} to="/provider/access" />
        <Stat label="Approved distributors" value={approved.data?.total ?? '…'} to="/provider/access" />
      </div>
      {isAdmin ? (
        <NextSteps steps={[
          { done: !!org.settlement, text: 'Add your settlement account', to: '/provider/profile' },
          { done: list.length > 0, text: 'Create your first product', to: '/provider/products/new' },
          { done: active > 0, text: 'Add a plan and activate a product', to: '/provider/products' },
          { done: (approved.data?.total ?? 0) > 0, text: 'Approve a distributor', to: '/provider/access' },
        ]} />
      ) : null}
      <Card title="Products" actions={<Link className="portal-button secondary" to="/provider/products">View all</Link>}>
        {list.length === 0 && !products.loading ? <p>No products yet.</p> : (
          <table className="portal-table">
            <thead><tr><th>Name</th><th>Type</th><th>Plans</th><th>Status</th></tr></thead>
            <tbody>
              {list.slice(0, 5).map((p) => (
                <tr key={p.id}>
                  <td><Link to={`/provider/products/${p.id}`}>{p.name}</Link></td>
                  <td>{label(p.type)}</td>
                  <td>{p.plans.filter((x) => x.active).length} active</td>
                  <td><Pill value={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}

function DistributorDashboard() {
  const { org, isAdmin } = useSession();
  const catalogue = useLoad(() => distributorApi.catalogue(), []);
  if (!org) return null;
  const items = catalogue.data ?? [];
  const count = (s: string | null) => items.filter((i) => i.accessStatus === s).length;

  return (
    <>
      <PageHeader eyebrow={org.type === 'API_PARTNER' ? 'API partner overview' : 'Dealer overview'} title={orgName(org)} />
      {catalogue.error ? <Banner tone="error">{catalogue.error}</Banner> : null}
      <div className="ui-stats">
        <Stat label="Products available" value={catalogue.loading ? '…' : items.length} to="/distributor/catalogue" />
        <Stat label="Approved to sell" value={catalogue.loading ? '…' : count('APPROVED')} to="/distributor/access" />
        <Stat label="Awaiting provider" value={catalogue.loading ? '…' : count('PENDING')} to="/distributor/access" />
        <Stat label="Not yet requested" value={catalogue.loading ? '…' : count(null)} to="/distributor/catalogue" />
      </div>
      {isAdmin ? (
        <NextSteps steps={[
          { done: !!org.settlement, text: 'Add your settlement account', to: '/distributor/profile' },
          { done: items.some((i) => i.accessStatus !== null), text: 'Request access to a product', to: '/distributor/catalogue' },
          { done: count('APPROVED') > 0, text: 'Get approved by a provider', to: '/distributor/access' },
        ]} />
      ) : null}
      <Card title="Selling">
        <p>
          Customer entry, quotes and payment links arrive in the next release. Once a provider approves your access, those
          products will be ready to sell here{org.type === 'API_PARTNER' ? ' and through the API' : ''}.
        </p>
      </Card>
    </>
  );
}
