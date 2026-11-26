import { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useOrgKind, useSession } from '../../context/SessionContext';
import { orgApi } from '../../lib/api';
import { errorText } from '../../lib/http';
import { bytes } from '../../lib/format';
import { checkFile, uploadKycFile } from '../../lib/upload';
import { KYC_ACCEPT, KYC_DETAIL_FIELDS, KYC_DOC_LABELS, KYC_MAX_DOCS, KYC_SUGGESTED_DOCS } from '../../config/kyc';
import type { KycDocKind } from '../../lib/types';
import { PageHeader } from '../../components/PortalShell';
import { Banner, Button, Card, Field, PageIntro } from '../../components/ui';

interface DocRow {
  key: number;
  kind: KycDocKind;
  required?: boolean;
  file?: File;
  publicId?: string;
  state: 'empty' | 'uploading' | 'done' | 'error';
  error?: string;
}

const ALL_KINDS = Object.keys(KYC_DOC_LABELS) as KycDocKind[];

export default function Kyc() {
  const kind = useOrgKind();
  const { org, isAdmin, reloadOrg } = useSession();
  const navigate = useNavigate();
  const nextKey = useRef(KYC_SUGGESTED_DOCS.length);
  const [details, setDetails] = useState<Record<string, string>>(() => ({ cacNumber: org?.rcNumber ?? '' }));
  const [rows, setRows] = useState<DocRow[]>(() => KYC_SUGGESTED_DOCS.map((d, i) => ({ key: i, kind: d.kind, required: d.required, state: 'empty' })));
  const [addKind, setAddKind] = useState<KycDocKind>('OTHER');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (org && org.status !== 'PENDING_KYC' && org.status !== 'REJECTED') return <Navigate to={`/${kind}`} replace />;

  const patch = (key: number, p: Partial<DocRow>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));

  const pick = async (row: DocRow, file: File | undefined) => {
    if (!file) return;
    const problem = checkFile(file);
    if (problem) { patch(row.key, { file, state: 'error', error: problem, publicId: undefined }); return; }
    patch(row.key, { file, state: 'uploading', error: undefined, publicId: undefined });
    try {
      const publicId = await uploadKycFile(kind, row.kind, file);
      patch(row.key, { state: 'done', publicId });
    } catch (e) {
      patch(row.key, { state: 'error', error: errorText(e, e instanceof Error ? e.message : undefined) });
    }
  };

  const addRow = () => {
    if (rows.length >= KYC_MAX_DOCS) return;
    setRows((rs) => [...rs, { key: nextKey.current++, kind: addKind, state: 'empty' }]);
  };

  const submit = async () => {
    if (busy) return;
    setBanner(null);
    const errs: Record<string, string> = {};
    for (const f of KYC_DETAIL_FIELDS) if (f.required && !details[f.key]?.trim()) errs[f.key] = `${f.label} is required.`;
    setFieldErrors(errs);
    if (rows.some((r) => r.state === 'uploading')) { setBanner('Wait for the uploads to finish.'); return; }
    if (!rows.some((r) => r.kind === 'CAC_CERTIFICATE' && r.state === 'done')) { setBanner('Upload your CAC certificate. It is required.'); return; }
    if (Object.keys(errs).length) return;

    const payload: Record<string, unknown> = {};
    for (const f of KYC_DETAIL_FIELDS) {
      const v = details[f.key]?.trim();
      if (!v) continue;
      payload[f.key] = f.type === 'list' ? v.split(',').map((s) => s.trim()).filter(Boolean) : v;
    }
    const documents = rows.filter((r) => r.state === 'done' && r.publicId).map((r) => ({ kind: r.kind, publicId: r.publicId! }));

    setBusy(true);
    try {
      await orgApi.submitKyc(kind, { details: payload, documents });
      await reloadOrg();
      navigate(`/${kind}`, { replace: true });
    } catch (e) {
      setBanner(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const rejected = org?.status === 'REJECTED';

  return (
    <>
      <PageHeader eyebrow="Verification" title={rejected ? 'Resubmit your KYC' : 'Verify your business'} />
      <PageIntro>
        TheeInsurance verifies every organisation before it can work on the network. Upload clear copies of your documents
        (JPG, PNG or PDF, up to 5 MB each). They go straight to secure storage and only reviewers can open them.
      </PageIntro>

      {rejected && org?.latestKyc?.reviewNote ? (
        <Banner tone="warn"><strong>Why the last submission was rejected:</strong> {org.latestKyc.reviewNote}. Upload new documents below.</Banner>
      ) : null}
      {!isAdmin ? <Banner tone="info">Only an admin in your organisation can submit KYC. Ask your admin to complete this step.</Banner> : null}

      <div className="dashboard-grid">
        <Card title="Business details">
          <div className="portal-form-grid">
            {KYC_DETAIL_FIELDS.map((f) => (
              <Field key={f.key} label={`${f.label}${f.required ? '' : ' (optional)'}`} hint={f.hint} error={fieldErrors[f.key]} full={f.type === 'textarea'}>
                {f.type === 'textarea'
                  ? <textarea rows={3} value={details[f.key] ?? ''} disabled={!isAdmin} onChange={(e) => setDetails((d) => ({ ...d, [f.key]: e.target.value }))} />
                  : <input value={details[f.key] ?? ''} disabled={!isAdmin} onChange={(e) => setDetails((d) => ({ ...d, [f.key]: e.target.value }))} />}
              </Field>
            ))}
          </div>
        </Card>

        <Card title="Documents">
          <ul className="doc-list">
            {rows.map((r) => (
              <li key={r.key} className={`doc-row doc-${r.state}`}>
                <div className="doc-meta">
                  <strong>{KYC_DOC_LABELS[r.kind]}{r.required ? <span className="doc-req">Required</span> : null}</strong>
                  <small>
                    {r.state === 'empty' && 'No file yet'}
                    {r.state === 'uploading' && `Uploading ${r.file?.name}…`}
                    {r.state === 'done' && `${r.file?.name} · ${bytes(r.file?.size ?? 0)} · uploaded`}
                    {r.state === 'error' && <span className="ui-field-error">{r.error}</span>}
                  </small>
                </div>
                <div className="doc-actions">
                  <label className={`portal-button secondary file-button ${!isAdmin || r.state === 'uploading' ? 'disabled' : ''}`}>
                    {r.state === 'done' ? 'Replace' : 'Choose file'}
                    <input
                      type="file"
                      accept={KYC_ACCEPT}
                      disabled={!isAdmin || r.state === 'uploading'}
                      onChange={(e) => { pick(r, e.target.files?.[0]); e.target.value = ''; }}
                    />
                  </label>
                  {!r.required && (
                    <Button variant="ghost" aria-label={`Remove ${KYC_DOC_LABELS[r.kind]}`} disabled={r.state === 'uploading'}
                      onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>Remove</Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {isAdmin && rows.length < KYC_MAX_DOCS ? (
            <div className="portal-actions">
              <select value={addKind} onChange={(e) => setAddKind(e.target.value as KycDocKind)} aria-label="Document type to add" className="ui-select">
                {ALL_KINDS.map((k) => <option key={k} value={k}>{KYC_DOC_LABELS[k]}</option>)}
              </select>
              <Button variant="secondary" onClick={addRow}>Add another document</Button>
            </div>
          ) : null}
        </Card>
      </div>

      {banner ? <Banner tone="error">{banner}</Banner> : null}
      {isAdmin ? (
        <div className="portal-actions">
          <Button busy={busy} onClick={submit}>Submit for review</Button>
          <span className="ui-hint">Rows without a file are skipped.</span>
        </div>
      ) : null}
    </>
  );
}
