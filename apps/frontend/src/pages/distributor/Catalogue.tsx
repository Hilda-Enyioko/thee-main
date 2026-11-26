import { useMemo, useState } from 'react';
import { useSession } from '../../context/SessionContext';
import { distributorApi } from '../../lib/api';
import { label, pct } from '../../lib/format';
import { useAction, useLoad } from '../../lib/useLoad';
import type { CatalogueItem, Grant, ProductType } from '../../lib/types';
import { PageHeader } from '../../components/PortalShell';
import { Async, Banner, Button, Card, Empty, PageIntro, Pill, Tabs } from '../../components/ui';

export default function Catalogue() {
  const { org, isAdmin } = useSession();
  const approved = org?.status === 'APPROVED';
  const catalogue = useLoad(() => distributorApi.catalogue(), []);
  // Latest request per product, for the provider's note and the commission.
  const requests = useLoad(() => (approved ? distributorApi.accessRequests({ limit: 50 }) : Promise.resolve(null)), [approved]);
  const latest = useMemo(() => {
    const m = new Map<string, Grant>();
    for (const g of requests.data?.items ?? []) {
      const prev = m.get(g.product.id);
      if (!prev || prev.createdAt < g.createdAt) m.set(g.product.id, g);
    }
    return m;
  }, [requests.data]);

  const [type, setType] = useState<'ALL' | ProductType>('ALL');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const action = useAction();

  const items = (catalogue.data ?? []).filter((i) =>
    (type === 'ALL' || i.type === type) &&
    (!query.trim() || `${i.name} ${i.provider.name} ${i.code}`.toLowerCase().includes(query.trim().toLowerCase())));

  const request = async (item: CatalogueItem) => {
    setBusyId(item.id);
    setNotice(null);
    const g = await action.run(() => distributorApi.requestAccess(item.id));
    if (g) {
      catalogue.setData((list) => list?.map((x) => (x.id === item.id ? { ...x, accessStatus: g.status } : x)));
      requests.reload();
      setNotice(`Request sent to ${item.provider.name}. You will see their answer here and under My requests.`);
    }
    setBusyId(null);
  };

  return (
    <>
      <PageHeader eyebrow="Distribution" title="Product catalogue" />
      <PageIntro>
        Active Motor and Gadget products from approved providers. Request access to the ones you want to sell; the provider
        decides and sets your commission.
      </PageIntro>
      {!approved ? <Banner tone="info">You can browse now. Requesting access opens once TheeInsurance approves your verification.</Banner> : null}
      {approved && !isAdmin ? <Banner tone="info">Only admins in your organisation can request access.</Banner> : null}
      {notice ? <Banner tone="ok">{notice}</Banner> : null}
      {action.error ? <Banner tone="error">{action.error}</Banner> : null}

      <div className="ui-toolbar">
        <Tabs value={type} onChange={setType} options={[{ value: 'ALL', label: 'All' }, { value: 'MOTOR', label: 'Motor' }, { value: 'GADGET', label: 'Gadget' }]} />
        <input className="ui-search" type="search" placeholder="Search products or providers" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <Async loading={catalogue.loading} error={catalogue.error} onRetry={catalogue.reload}>
        {items.length === 0 ? <Card><Empty title="No products match">Providers publish products here once they are approved and active.</Empty></Card> : (
          <div className="catalogue-grid">
            {items.map((item) => {
              const g = latest.get(item.id);
              const s = item.accessStatus;
              const canRequest = approved && isAdmin && (s === null || s === 'REJECTED');
              return (
                <article key={item.id} className="portal-card catalogue-card">
                  <div className="catalogue-top">
                    <span className={`type-tag type-${item.type.toLowerCase()}`}>{label(item.type)}</span>
                    {s ? <Pill value={s} text={s === 'PENDING' ? 'Awaiting provider' : undefined} /> : null}
                  </div>
                  <h2>{item.name}</h2>
                  <p className="catalogue-provider">by {item.provider.name} · <code>{item.code}</code></p>
                  {s === 'APPROVED' ? <p className="catalogue-note ok">Approved · {pct(g?.commissionBps)} commission</p> : null}
                  {s === 'REJECTED' && g?.reviewNote ? <p className="catalogue-note bad">Provider note: {g.reviewNote}</p> : null}
                  {s === 'REVOKED' ? <p className="catalogue-note bad">Access was revoked{g?.reviewNote ? `: ${g.reviewNote}` : ''}. Contact the provider to restore it.</p> : null}
                  <div className="catalogue-actions">
                    {canRequest ? (
                      <Button busy={busyId === item.id} onClick={() => request(item)}>{s === 'REJECTED' ? 'Request again' : 'Request access'}</Button>
                    ) : (
                      <Button variant="secondary" disabled>
                        {s === 'PENDING' ? 'Request sent' : s === 'APPROVED' ? 'Approved' : s === 'REVOKED' ? 'Revoked' : 'Request access'}
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Async>
    </>
  );
}
