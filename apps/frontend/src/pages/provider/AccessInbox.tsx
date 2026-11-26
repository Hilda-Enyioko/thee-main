import { useMemo, useState } from 'react';
import { useSession } from '../../context/SessionContext';
import { providerApi } from '../../lib/api';
import { bpsToPctInput, dateTime, label, pct, pctToBps } from '../../lib/format';
import { useAction, useLoad } from '../../lib/useLoad';
import type { Grant, GrantStatus } from '../../lib/types';
import { PageHeader } from '../../components/PortalShell';
import { Async, Banner, Button, Card, Empty, Field, Modal, PageIntro, Pager, Pill, Tabs } from '../../components/ui';

type Filter = GrantStatus | 'ALL';
type Dialog = { mode: 'approve' | 'reject' | 'revoke'; grant: Grant } | null;

export default function AccessInbox() {
  const { isAdmin } = useSession();
  const [status, setStatus] = useState<Filter>('PENDING');
  const [page, setPage] = useState(1);
  const list = useLoad(() => providerApi.accessRequests({ status: status === 'ALL' ? undefined : status, page, limit: 20 }), [status, page]);
  // Product defaults prefill the commission when approving.
  const products = useLoad(() => providerApi.products(), []);
  const defaults = useMemo(() => new Map((products.data ?? []).map((p) => [p.id, p.defaultCommissionBps])), [products.data]);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const changeFilter = (s: Filter) => { setStatus(s); setPage(1); };
  const done = (g: Grant, text: string) => {
    setDialog(null);
    setNotice(text);
    // The item now belongs to another tab; reload to keep the list accurate.
    if (status !== 'ALL') list.reload();
    else list.setData((d) => d && { ...d, items: d.items.map((x) => (x.id === g.id ? { ...x, ...g } : x)) });
  };

  return (
    <>
      <PageHeader eyebrow="Distribution" title="Access requests" />
      <PageIntro>
        Distributors verified by TheeInsurance ask to sell your active products. Approve them with a distributor commission,
        or reject with a note they will see.
      </PageIntro>
      {notice ? <Banner tone="ok">{notice}</Banner> : null}
      <Tabs value={status} onChange={changeFilter} options={[
        { value: 'PENDING', label: 'Pending' },
        { value: 'APPROVED', label: 'Approved' },
        { value: 'REJECTED', label: 'Rejected' },
        { value: 'REVOKED', label: 'Revoked' },
        { value: 'ALL', label: 'All' },
      ]} />
      <Card>
        <Async loading={list.loading && !list.data} error={list.error} onRetry={list.reload}>
          {list.data?.items.length ? (
            <>
              <table className="portal-table">
                <thead><tr><th>Distributor</th><th>Product</th><th>Requested</th><th>Status</th><th>Commission</th><th /></tr></thead>
                <tbody>
                  {list.data.items.map((g) => (
                    <tr key={g.id}>
                      <td>
                        <strong>{g.distributor?.name}</strong>
                        <small className="ui-sub">{g.distributor?.type === 'API_PARTNER' ? 'API partner' : 'Dealer or shop'}{g.distributor?.city ? ` · ${g.distributor.city}` : ''}</small>
                      </td>
                      <td>{g.product.name}<small className="ui-sub">{label(g.product.type)}</small></td>
                      <td>{dateTime(g.createdAt)}</td>
                      <td><Pill value={g.status} />{g.reviewNote ? <small className="ui-sub">{g.reviewNote}</small> : null}</td>
                      <td>{g.status === 'APPROVED' ? pct(g.commissionBps) : '—'}</td>
                      <td className="ui-row-actions">
                        {isAdmin && g.status === 'PENDING' ? <>
                          <Button onClick={() => setDialog({ mode: 'approve', grant: g })}>Approve</Button>
                          <Button variant="danger" onClick={() => setDialog({ mode: 'reject', grant: g })}>Reject</Button>
                        </> : null}
                        {isAdmin && g.status === 'APPROVED' ? <Button variant="ghost" onClick={() => setDialog({ mode: 'revoke', grant: g })}>Revoke</Button> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pager page={page} limit={list.data.limit} total={list.data.total} onPage={setPage} />
            </>
          ) : <Empty title={status === 'PENDING' ? 'No requests waiting' : 'Nothing here yet'} />}
        </Async>
      </Card>
      {dialog ? <ReviewDialog dialog={dialog} defaultBps={defaults.get(dialog.grant.product.id) ?? null} onClose={() => setDialog(null)} onDone={done} /> : null}
    </>
  );
}

function ReviewDialog({ dialog, defaultBps, onClose, onDone }:
  { dialog: NonNullable<Dialog>; defaultBps: number | null; onClose: () => void; onDone: (g: Grant, text: string) => void }) {
  const { mode, grant } = dialog;
  const [commission, setCommission] = useState(bpsToPctInput(defaultBps));
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const action = useAction();
  const who = grant.distributor?.name ?? 'this distributor';

  const submit = async () => {
    setError(null);
    if (mode === 'approve') {
      const bps = pctToBps(commission);
      if (bps === null) { setError('Enter the distributor commission as a percentage from 0 to 100.'); return; }
      const g = await action.run(() => providerApi.reviewAccess(grant.id, { decision: 'APPROVED', commissionBps: bps, ...(note.trim() ? { note: note.trim() } : {}) }));
      if (g) onDone(g, `${who} can now sell ${grant.product.name} at ${pct(bps)} commission.`);
    } else if (mode === 'reject') {
      if (!note.trim()) { setError('Add a note so the distributor knows why.'); return; }
      const g = await action.run(() => providerApi.reviewAccess(grant.id, { decision: 'REJECTED', note: note.trim() }));
      if (g) onDone(g, `Request from ${who} rejected.`);
    } else {
      if (note.trim().length < 3) { setError('Add a note of at least 3 characters.'); return; }
      const g = await action.run(() => providerApi.revokeAccess(grant.id, note.trim()));
      if (g) onDone(g, `Access for ${who} revoked.`);
    }
  };

  const title = mode === 'approve' ? 'Approve access' : mode === 'reject' ? 'Reject request' : 'Revoke access';
  return (
    <Modal title={title} onClose={onClose} footer={<>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button variant={mode === 'approve' ? 'primary' : 'danger'} busy={action.busy} onClick={submit}>{title}</Button>
    </>}>
      <p><strong>{who}</strong> · {grant.product.name}</p>
      {error || action.error ? <Banner tone="error">{error ?? action.error}</Banner> : null}
      {mode === 'approve' ? (
        <Field label="Distributor commission (%)" hint={defaultBps !== null ? `Product default is ${pct(defaultBps)}. Saved on this grant; later default changes do not affect it.` : 'This product has no default, so enter one.'}>
          <input inputMode="decimal" value={commission} onChange={(e) => setCommission(e.target.value)} placeholder="15" />
        </Field>
      ) : null}
      {mode === 'revoke' ? <p className="ui-hint">The distributor can no longer sell this product and cannot request it again; they will need to contact you.</p> : null}
      <Field label={mode === 'approve' ? 'Note (optional)' : 'Note (shown to the distributor)'}>
        <textarea rows={3} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)}
          placeholder={mode === 'approve' ? 'Welcome aboard' : mode === 'reject' ? 'Outside our coverage area' : 'Contract ended'} />
      </Field>
    </Modal>
  );
}
