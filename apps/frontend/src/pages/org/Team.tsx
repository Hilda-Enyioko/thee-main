import { useState } from 'react';
import { useOrgKind, useSession } from '../../context/SessionContext';
import { orgApi } from '../../lib/api';
import { date } from '../../lib/format';
import { useAction, useLoad } from '../../lib/useLoad';
import type { Member, OrgRole } from '../../lib/types';
import { PageHeader } from '../../components/PortalShell';
import { Async, Banner, Button, Card, Field, Modal, PageIntro, Pill } from '../../components/ui';

export default function Team() {
  const kind = useOrgKind();
  const { viewer } = useSession();
  const team = useLoad(() => orgApi.team(kind), [kind]);
  const [adding, setAdding] = useState(false);
  const action = useAction();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const replace = (m: Member) => team.setData((list) => list?.map((x) => (x.id === m.id ? m : x)));

  const toggle = async (m: Member) => {
    setPendingId(m.id);
    const updated = await action.run(() => (m.status === 'ACTIVE' ? orgApi.deactivate(kind, m.id) : orgApi.reactivate(kind, m.id)));
    if (updated) replace(updated);
    setPendingId(null);
  };

  return (
    <>
      <PageHeader eyebrow="Organisation" title="Team" actions={<Button onClick={() => setAdding(true)}>Add member</Button>} />
      <PageIntro>Admins can change things; members can view. Deactivating someone signs them out immediately.</PageIntro>
      {action.error ? <Banner tone="error">{action.error}</Banner> : null}
      <Card>
        <Async loading={team.loading && !team.data} error={team.error} onRetry={team.reload}>
          <table className="portal-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Added</th><th /></tr></thead>
            <tbody>
              {(team.data ?? []).map((m) => {
                const self = m.id === viewer?.id;
                return (
                  <tr key={m.id}>
                    <td>{m.fullName}{self ? <span className="ui-you">You</span> : null}</td>
                    <td>{m.email}</td>
                    <td>{m.role === 'ADMIN' ? 'Admin' : 'Member'}</td>
                    <td><Pill value={m.status} /></td>
                    <td>{date(m.createdAt)}</td>
                    <td className="ui-row-actions">
                      {self ? null : m.status === 'ACTIVE' ? (
                        <Button variant="danger" busy={pendingId === m.id} onClick={() => toggle(m)}>Deactivate</Button>
                      ) : m.status === 'DEACTIVATED' ? (
                        <Button variant="secondary" busy={pendingId === m.id} onClick={() => toggle(m)}>Reactivate</Button>
                      ) : <span className="ui-hint">Suspended by TheeInsurance</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Async>
      </Card>
      {adding ? <AddMember onClose={() => setAdding(false)} onAdded={(m) => { team.setData((l) => [...(l ?? []), m]); setAdding(false); }} /> : null}
    </>
  );
}

function AddMember({ onClose, onAdded }: { onClose: () => void; onAdded: (m: Member) => void }) {
  const kind = useOrgKind();
  const [f, setF] = useState({ fullName: '', email: '', password: '', role: 'MEMBER' as OrgRole });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const action = useAction();

  const submit = async () => {
    const e: Record<string, string> = {};
    if (f.fullName.trim().length < 2) e.fullName = 'Enter their full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Enter a valid email.';
    if (f.password.length < 10 || f.password.length > 128) e.password = 'Use 10 to 128 characters.';
    setErrors(e);
    if (Object.keys(e).length) return;
    const m = await action.run(() => orgApi.addMember(kind, { ...f, fullName: f.fullName.trim(), email: f.email.trim() }));
    if (m) onAdded(m);
  };

  return (
    <Modal title="Add a team member" onClose={onClose} footer={<>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button busy={action.busy} onClick={submit}>Add member</Button>
    </>}>
      <Banner tone="info">For now you set their first password and share it with them. Email invites are coming.</Banner>
      {action.error ? <Banner tone="error">{action.error}</Banner> : null}
      <div className="portal-form-grid">
        <Field label="Full name" error={errors.fullName}><input value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} maxLength={120} /></Field>
        <Field label="Email" error={errors.email}><input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Temporary password" error={errors.password} hint="At least 10 characters"><input type="text" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} maxLength={128} autoComplete="off" /></Field>
        <Field label="Role">
          <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as OrgRole })}>
            <option value="MEMBER">Member (view only)</option>
            <option value="ADMIN">Admin</option>
          </select>
        </Field>
      </div>
    </Modal>
  );
}
