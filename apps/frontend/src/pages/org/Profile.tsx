import { useState } from 'react';
import { useOrgKind, useSession } from '../../context/SessionContext';
import { orgApi } from '../../lib/api';
import { date, label } from '../../lib/format';
import { useAction } from '../../lib/useLoad';
import type { ProfileBody } from '../../lib/types';
import { PageHeader } from '../../components/PortalShell';
import { Banner, Button, Card, Field, KeyValues, Loading, Pill } from '../../components/ui';

export default function Profile() {
  const kind = useOrgKind();
  const { org, isAdmin, setOrg } = useSession();
  const [form, setForm] = useState(() => ({
    tradingName: org?.tradingName ?? '', phone: org?.phone ?? '', address: org?.address ?? '',
    bankName: '', accountNumber: '', accountName: '',
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<string | null>(null);
  const action = useAction();
  if (!org) return <Loading />;

  const canEdit = isAdmin && org.status === 'APPROVED';
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (section: 'details' | 'settlement') => {
    setSaved(null);
    const errs: Record<string, string> = {};
    const body: ProfileBody = {};
    if (section === 'details') {
      if (form.phone.trim().length < 7 || form.phone.trim().length > 20) errs.phone = 'Enter a phone number (7–20 characters).';
      // Send only fields that changed, and never blank out a value.
      const t = form.tradingName.trim(), p = form.phone.trim(), a = form.address.trim();
      if (t && t !== (org.tradingName ?? '')) body.tradingName = t;
      if (p !== org.phone) body.phone = p;
      if (a && a !== (org.address ?? '')) body.address = a;
      if (!Object.keys(errs).length && !Object.keys(body).length) { setSaved('Nothing has changed.'); return; }
    } else {
      if (!form.bankName.trim()) errs.bankName = 'Enter the bank name.';
      if (!/^\d{10}$/.test(form.accountNumber)) errs.accountNumber = 'Account numbers are exactly 10 digits.';
      if (!form.accountName.trim()) errs.accountName = 'Enter the account name.';
      body.settlement = { bankName: form.bankName.trim(), accountNumber: form.accountNumber, accountName: form.accountName.trim() };
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const updated = await action.run(() => orgApi.updateProfile(kind, body));
    if (updated) {
      setOrg({ ...org, ...updated });
      if (section === 'settlement') setForm((f) => ({ ...f, bankName: '', accountNumber: '', accountName: '' }));
      setSaved(section === 'settlement' ? 'Settlement account saved.' : 'Details saved.');
    }
  };

  return (
    <>
      <PageHeader eyebrow="Organisation" title="Profile" />
      {!canEdit ? (
        <Banner tone="info">
          {org.status !== 'APPROVED' ? 'You can edit these details once your organisation is approved.' : 'Only admins can edit the profile.'}
        </Banner>
      ) : null}
      {saved ? <Banner tone="ok">{saved}</Banner> : null}
      {action.error ? <Banner tone="error">{action.error}</Banner> : null}

      <div className="dashboard-grid two-col">
        <Card title="Registration">
          <KeyValues rows={[
            ['Legal name', org.legalName],
            ['RC number', org.rcNumber],
            ['Business email', org.email],
            ...(org.type ? [['Distributor type', org.type === 'DEALER_SHOP' ? 'Dealer or shop' : 'API partner'] as [string, string]] : []),
            ...(kind === 'distributor' ? [['City', org.city ?? '—'] as [string, string]] : []),
            ['Status', <Pill value={org.status} />],
            ['Registered', date(org.createdAt)],
          ]} />
        </Card>

        <Card title="Contact details">
          <div className="portal-form-grid">
            <Field label="Trading name" full><input value={form.tradingName} onChange={set('tradingName')} disabled={!canEdit} maxLength={200} /></Field>
            <Field label="Phone" error={errors.phone}><input value={form.phone} onChange={set('phone')} disabled={!canEdit} maxLength={20} /></Field>
            <Field label="Address"><input value={form.address} onChange={set('address')} disabled={!canEdit} maxLength={300} /></Field>
          </div>
          {canEdit ? <div className="portal-actions"><Button busy={action.busy} onClick={() => save('details')}>Save details</Button></div> : null}
        </Card>

        <Card title="Settlement account" className="portal-field-full">
          {org.settlement ? (
            <KeyValues rows={[
              ['Bank', org.settlement.bankName],
              ['Account name', org.settlement.accountName],
              ['Account number', `•••••• ${org.settlement.accountNumberLast4}`],
            ]} />
          ) : <p>No settlement account yet. {kind === 'provider' ? 'Premiums' : 'Commission'} will be paid into this account.</p>}
          {canEdit ? (
            <>
              <p className="ui-hint">{org.settlement ? 'Replace the account by entering new details.' : 'Add the account we should pay into.'} For safety, only the last four digits are shown after saving.</p>
              <div className="portal-form-grid three">
                <Field label="Bank name" error={errors.bankName}><input value={form.bankName} onChange={set('bankName')} placeholder="Access Bank" /></Field>
                <Field label="Account number" error={errors.accountNumber}>
                  <input value={form.accountNumber} inputMode="numeric" maxLength={10} onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value.replace(/\D/g, '') }))} placeholder="0123456789" />
                </Field>
                <Field label="Account name" error={errors.accountName}><input value={form.accountName} onChange={set('accountName')} /></Field>
              </div>
              <div className="portal-actions"><Button busy={action.busy} onClick={() => save('settlement')}>Save settlement account</Button></div>
            </>
          ) : null}
        </Card>
      </div>
      <p className="ui-hint">Organisation status: {label(org.status)}</p>
    </>
  );
}
