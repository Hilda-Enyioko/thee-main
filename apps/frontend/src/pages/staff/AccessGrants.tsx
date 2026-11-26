import { useState } from 'react';
import { staffApi } from '../../lib/api';
import { dateTime, label, pct } from '../../lib/format';
import { useAction, useLoad } from '../../lib/useLoad';
import type { Grant, GrantStatus } from '../../lib/types';
import { PageHeader } from '../../components/PortalShell';
import { Async, Banner, Button, Card, Empty, Field, Modal, PageIntro, Pager, Pill, Tabs } from '../../components/ui';

type Filter = GrantStatus | 'ALL';
interface OrgFilter { id: string; name: string }

export default function AccessGrants() {
  const [status, setStatus] = useState<Filter>('APPROVED');
  const [provider, setProvider] = useState<OrgFilter | null>(null);
  const [distributor, setDistributor] = useState<OrgFilter | null>(null);
  const [page, setPage] = useState(1);
  const list = useLoad(() => staffApi.grants({
    status: status === 'ALL' ? undefined : status, providerId: provider?.id, distributorId: distributor?.id, page, limit: 20,
  }), [status, provider?.id, distributor?.id, page]);
  const [revoking, setRevoking] = useState<Grant | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reset = () => setPage(1);

  return (
    <>
      <PageHeader eyebrow="Staff console" title="Access grants" />
      <PageIntro>Every distributor’s access to a provider’s product. Providers approve access; staff can view and revoke it. Click a name to filter by it.</PageIntro>
      {notice ? <Banner tone="ok">{notice}</Banner> : null}
      <div className="ui-toolbar">
        <Tabs value={status} onChange={(s) => { setStatus(s); reset(); }} options={[
          { value: 'APPROVED', label: 'Approved' },
          { value: 'PENDING', label: 'Pending' },
          { value: 'REJECTED', label: 'Rejected' },
          { value: 'REVOKED', label: 'Revoked' },
          { value: 'ALL', label: 'All' },
        ]} />
        <div className="ui-chips">
          {provider ? <button type="button" className="ui-chip" onClick={() => { setProvider(null); reset(); }}>Provider: {provider.name} ×</button> : null}
          {distributor ? <button type="button" className="ui-chip" onClick={() => { setDistributor(null); reset(); }}>Distributor: {distributor.name} ×</button> : null}
        </div>
      </div>
      <Card>
        <Async loading={list.loading && !list.data} error={list.status === 403 ? 'Your staff role cannot view access grants.' : list.error} onRetry={list.reload}>
          {list.data?.items.length ? (
            <>
              <table className="portal-table">
                <thead><tr><th>Distributor</th><th>Provider</th><th>Product</th><th>Status</th><th>Commission</th><th>Updated</th><th /></tr></thead>
                <tbody>
                  {list.data.items.map((g) => (
                    <tr key={g.id}>
                      <td>
                        {g.distributor ? <button type="button" className="link-button" onClick={() => { setDistributor({ id: g.distributor!.id, name: g.distributor!.name }); reset(); }}>{g.distributor.name}</button> : '—'}
                        <small className="ui-sub">{g.distributor?.type === 'API_PARTNER' ? 'API partner' : 'Dealer or shop'}{g.distributor?.city ? ` · ${g.distributor.city}` : ''}</small>
                      </td>
                      <td>{g.provider ? <button type="button" className="link-button" onClick={() => { setProvider({ id: g.provider!.id, name: g.provider!.name }); reset(); }}>{g.provider.name}</button> : '—'}</td>
                      <td>{g.product.name}<small className="ui-sub">{label(g.product.type)}</small></td>
                      <td><Pill value={g.status} />{g.reviewNote ? <small className="ui-sub">{g.reviewNote}</small> : null}</td>
                      <td>{g.status === 'APPROVED' ? pct(g.commissionBps) : '—'}</td>
                      <td>{dateTime(g.reviewedAt ?? g.createdAt)}</td>
                      <td className="ui-row-actions">{g.status === 'APPROVED' ? <Button variant="ghost" onClick={() => setRevoking(g)}>Revoke</Button> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pager page={page} limit={list.data.limit} total={list.data.total} onPage={setPage} />
            </>
          ) : <Empty title="No grants match these filters" />}
        </Async>
      </Card>
      {revoking ? <RevokeDialog grant={revoking} onClose={() => setRevoking(null)} onDone={() => {
        setNotice(`Access for ${revoking.distributor?.name ?? 'the distributor'} to ${revoking.product.name} revoked.`);
        setRevoking(null);
        list.reload();
      }} /> : null}
    </>
  );
}

function RevokeDialog({ grant, onClose, onDone }: { grant: Grant; onClose: () => void; onDone: () => void }) {
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const action = useAction();
  const submit = async () => {
    setError(null);
    if (note.trim().length < 3) { setError('Add a note of at least 3 characters.'); return; }
    const g = await action.run(() => staffApi.revokeGrant(grant.id, note.trim()));
    if (g) onDone();
  };
  return (
    <Modal title="Revoke access" onClose={onClose} footer={<>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button variant="danger" busy={action.busy} onClick={submit}>Revoke access</Button>
    </>}>
      <p><strong>{grant.distributor?.name}</strong> will stop selling <strong>{grant.product.name}</strong> from {grant.provider?.name}.</p>
      {error || action.error ? <Banner tone="error">{error ?? action.error}</Banner> : null}
      <Field label="Reason (shown to both parties)">
        <textarea rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Compliance review" />
      </Field>
    </Modal>
  );
}
