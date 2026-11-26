import { useState } from 'react';
import { staffApi, type ReviewTarget } from '../../lib/api';
import { errorText } from '../../lib/http';
import { bytes, dateTime, label, orgName } from '../../lib/format';
import { useAction, useLoad } from '../../lib/useLoad';
import { KYC_DOC_LABELS } from '../../config/kyc';
import type { KycDocument, OrgForReview, OrgStatus } from '../../lib/types';
import { PageHeader } from '../../components/PortalShell';
import { Async, Banner, Button, Card, Empty, Field, KeyValues, Modal, PageIntro, Pager, Pill, Tabs } from '../../components/ui';

const STATUSES: OrgStatus[] = ['UNDER_REVIEW', 'PENDING_KYC', 'APPROVED', 'REJECTED', 'SUSPENDED'];

export default function KycQueue() {
  const [target, setTarget] = useState<ReviewTarget>('providers');
  const [status, setStatus] = useState<OrgStatus>('UNDER_REVIEW');
  const [page, setPage] = useState(1);
  const list = useLoad(() => staffApi.kycQueue(target, { status, page, limit: 20 }), [target, status, page]);
  const [open, setOpen] = useState<OrgForReview | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <>
      <PageHeader eyebrow="Staff console" title="KYC review" />
      <PageIntro>Oldest submissions first. Open one to view its documents, then approve it or reject it with a note the organisation will see.</PageIntro>
      {notice ? <Banner tone="ok">{notice}</Banner> : null}
      <div className="ui-toolbar">
        <Tabs value={target} onChange={(t) => { setTarget(t); setPage(1); setNotice(null); }} options={[
          { value: 'providers', label: 'Providers' },
          { value: 'distributors', label: 'Distributors' },
        ]} />
        <select className="ui-select" value={status} aria-label="Status" onChange={(e) => { setStatus(e.target.value as OrgStatus); setPage(1); }}>
          {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </select>
      </div>
      <Card>
        <Async loading={list.loading && !list.data} error={list.status === 403 ? 'Your staff role cannot review KYC.' : list.error} onRetry={list.reload}>
          {list.data?.items.length ? (
            <>
              <table className="portal-table">
                <thead><tr><th>Organisation</th><th>RC number</th>{target === 'distributors' ? <th>Type</th> : null}<th>Submitted</th><th>Documents</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {list.data.items.map((o) => (
                    <tr key={o.id}>
                      <td><strong>{orgName(o)}</strong><small className="ui-sub">{o.email}</small></td>
                      <td>{o.rcNumber}</td>
                      {target === 'distributors' ? <td>{o.type === 'API_PARTNER' ? 'API partner' : 'Dealer or shop'}{o.city ? <small className="ui-sub">{o.city}</small> : null}</td> : null}
                      <td>{dateTime(o.latestKyc?.submittedAt)}</td>
                      <td>{o.latestKyc?.documents.length ?? 0}</td>
                      <td><Pill value={o.status} /></td>
                      <td className="ui-row-actions"><Button variant="secondary" onClick={() => setOpen(o)}>{o.status === 'UNDER_REVIEW' ? 'Review' : 'View'}</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pager page={page} limit={list.data.limit} total={list.data.total} onPage={setPage} />
            </>
          ) : <Empty title={status === 'UNDER_REVIEW' ? 'The queue is clear' : 'No organisations with this status'} />}
        </Async>
      </Card>
      {open ? (
        <ReviewModal
          org={open}
          target={target}
          onClose={() => setOpen(null)}
          onDecided={(text) => { setOpen(null); setNotice(text); list.reload(); }}
        />
      ) : null}
    </>
  );
}

const detailValue = (v: unknown) =>
  Array.isArray(v) ? v.join(', ') : v !== null && typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—');

function ReviewModal({ org, target, onClose, onDecided }:
  { org: OrgForReview; target: ReviewTarget; onClose: () => void; onDecided: (text: string) => void }) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const action = useAction();
  const kyc = org.latestKyc;
  const reviewable = org.status === 'UNDER_REVIEW' && kyc?.status === 'SUBMITTED';

  // Links expire in 5 minutes, so fetch one per click and open it at once.
  // The tab opens synchronously so popup blockers allow it.
  const openDoc = async (d: KycDocument) => {
    setError(null);
    setOpening(d.publicId);
    const tab = window.open('', '_blank');
    if (tab) tab.opener = null;
    try {
      const { url } = await staffApi.documentUrl(d.publicId, d.format);
      if (tab) tab.location.href = url;
      else window.location.assign(url);
    } catch (e) {
      tab?.close();
      setError(errorText(e));
    } finally {
      setOpening(null);
    }
  };

  const decide = async (decision: 'APPROVED' | 'REJECTED') => {
    setError(null);
    if (decision === 'REJECTED' && !note.trim()) { setError('A note is required when rejecting. The organisation will see it.'); return; }
    const res = await action.run(() => staffApi.decideKyc(target, org.id, decision === 'APPROVED' ? { decision } : { decision, note: note.trim() }));
    if (res) onDecided(`${orgName(org)} ${decision === 'APPROVED' ? 'approved' : 'rejected'}.`);
  };

  return (
    <Modal wide title={orgName(org)} onClose={onClose} footer={reviewable ? (
      rejecting ? <>
        <Button variant="secondary" onClick={() => setRejecting(false)}>Back</Button>
        <Button variant="danger" busy={action.busy} onClick={() => decide('REJECTED')}>Reject submission</Button>
      </> : <>
        <Button variant="danger" onClick={() => setRejecting(true)}>Reject</Button>
        <Button busy={action.busy} onClick={() => decide('APPROVED')}>Approve</Button>
      </>
    ) : <Button variant="secondary" onClick={onClose}>Close</Button>}>
      {error || action.error ? <Banner tone="error">{error ?? action.error}</Banner> : null}
      <div className="dashboard-grid two-col">
        <div>
          <h3 className="ui-subhead">Organisation</h3>
          <KeyValues rows={[
            ['Legal name', org.legalName],
            ['Trading name', org.tradingName ?? '—'],
            ['RC number', org.rcNumber],
            ['Email', org.email],
            ['Phone', org.phone],
            ['Address', org.address ?? '—'],
            ...(org.type ? [['Type', org.type === 'API_PARTNER' ? 'API partner' : 'Dealer or shop'] as [string, string], ['City', org.city ?? '—'] as [string, string]] : []),
            ['Status', <Pill value={org.status} />],
            ['Registered', dateTime(org.createdAt)],
          ]} />
        </div>
        <div>
          <h3 className="ui-subhead">Submitted details</h3>
          {kyc ? (
            <KeyValues rows={[
              ...Object.entries(kyc.details ?? {}).map(([k, v]) => [label(k.replace(/([A-Z])/g, '_$1').toUpperCase()), detailValue(v)] as [string, string]),
              ['Submitted', dateTime(kyc.submittedAt)],
              ['Submission status', <Pill value={kyc.status} />],
            ]} />
          ) : <p>No KYC submitted yet.</p>}
        </div>
      </div>

      {kyc?.documents.length ? (
        <>
          <h3 className="ui-subhead">Documents</h3>
          <p className="ui-hint">Each link lasts five minutes and every view is written to the audit log.</p>
          <ul className="doc-list">
            {kyc.documents.map((d) => (
              <li key={d.publicId} className="doc-row">
                <div className="doc-meta"><strong>{KYC_DOC_LABELS[d.kind] ?? label(d.kind)}</strong><small>{d.format.toUpperCase()} · {bytes(d.bytes)}</small></div>
                <Button variant="secondary" busy={opening === d.publicId} onClick={() => openDoc(d)}>Open</Button>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {reviewable && rejecting ? (
        <Field label="Reason for rejection (shown to the organisation)">
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="CAC certificate is unreadable" autoFocus />
        </Field>
      ) : null}
      {!reviewable && org.status === 'UNDER_REVIEW' ? <Banner tone="info">There is no submission waiting for a decision.</Banner> : null}
    </Modal>
  );
}
