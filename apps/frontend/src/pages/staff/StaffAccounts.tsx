import { useState } from 'react';
import { useSession } from '../../context/SessionContext';
import { staffApi } from '../../lib/api';
import { date, label } from '../../lib/format';
import { useAction, useLoad } from '../../lib/useLoad';
import type { StaffAccount, StaffRole, UserStatus } from '../../lib/types';
import { PageHeader } from '../../components/PortalShell';
import { Async, Banner, Button, Card, Field, Modal, PageIntro, Pill } from '../../components/ui';

const ROLES: { value: StaffRole; text: string }[] = [
  { value: 'KYC_REVIEWER', text: 'KYC reviewer · reviews submissions' },
  { value: 'SUPPORT', text: 'Support · views access grants' },
  { value: 'ADMIN', text: 'Admin · reviews and revokes' },
  { value: 'SUPER_ADMIN', text: 'Super admin · also manages staff' },
];

export default function StaffAccounts() {
  const { viewer } = useSession();
  const accounts = useLoad(() => staffApi.accounts(), []);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const action = useAction();

  const setStatus = async (a: StaffAccount, status: UserStatus) => {
    setBusyId(a.id);
    const updated = await action.run(() => staffApi.setAccountStatus(a.id, status));
    if (updated) accounts.setData((l) => l?.map((x) => (x.id === updated.id ? updated : x)));
    setBusyId(null);
  };

  return (
    <>
      <PageHeader eyebrow="Staff console" title="Staff accounts" actions={<Button onClick={() => setAdding(true)}>Add staff</Button>} />
      <PageIntro>Status changes take effect immediately and sign the person out. You cannot change your own status.</PageIntro>
      {action.error ? <Banner tone="error">{action.error}</Banner> : null}
      <Card>
        <Async loading={accounts.loading && !accounts.data} error={accounts.status === 403 ? 'Only Super Admins can manage staff accounts.' : accounts.error} onRetry={accounts.reload}>
          <table className="portal-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Added</th><th>Change status</th></tr></thead>
            <tbody>
              {(accounts.data ?? []).map((a) => {
                const self = a.id === viewer?.id;
                return (
                  <tr key={a.id}>
                    <td>{a.fullName}{self ? <span className="ui-you">You</span> : null}</td>
                    <td>{a.email}</td>
                    <td>{label(a.role)}</td>
                    <td><Pill value={a.status} /></td>
                    <td>{date(a.createdAt)}</td>
                    <td>
                      {self ? <span className="ui-hint">—</span> : (
                        <select className="ui-select" value={a.status} disabled={busyId === a.id} aria-label={`Status for ${a.fullName}`}
                          onChange={(e) => setStatus(a, e.target.value as UserStatus)}>
                          <option value="ACTIVE">Active</option>
                          <option value="DEACTIVATED">Deactivated</option>
                          <option value="SUSPENDED">Suspended</option>
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Async>
      </Card>
      {adding ? <AddStaff onClose={() => setAdding(false)} onAdded={(a) => { accounts.setData((l) => [...(l ?? []), a]); setAdding(false); }} /> : null}
    </>
  );
}

function AddStaff({ onClose, onAdded }: { onClose: () => void; onAdded: (a: StaffAccount) => void }) {
  const [f, setF] = useState({ fullName: '', email: '', password: '', role: 'KYC_REVIEWER' as StaffRole });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const action = useAction();
  const submit = async () => {
    const e: Record<string, string> = {};
    if (f.fullName.trim().length < 2 || f.fullName.trim().length > 120) e.fullName = 'Enter their full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Enter a valid email.';
    if (f.password.length < 10 || f.password.length > 128) e.password = 'Use 10 to 128 characters.';
    setErrors(e);
    if (Object.keys(e).length) return;
    const a = await action.run(() => staffApi.createAccount({ ...f, fullName: f.fullName.trim(), email: f.email.trim() }));
    if (a) onAdded(a);
  };
  return (
    <Modal title="Add a staff account" onClose={onClose} footer={<>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button busy={action.busy} onClick={submit}>Create account</Button>
    </>}>
      {action.error ? <Banner tone="error">{action.error}</Banner> : null}
      <div className="portal-form-grid">
        <Field label="Full name" error={errors.fullName}><input value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} maxLength={120} /></Field>
        <Field label="Email" error={errors.email}><input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Temporary password" error={errors.password} hint="At least 10 characters"><input type="text" autoComplete="off" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} maxLength={128} /></Field>
        <Field label="Role">
          <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as StaffRole })}>
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.text}</option>)}
          </select>
        </Field>
      </div>
    </Modal>
  );
}
