import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { providerApi } from '../../lib/api';
import { bpsToPctInput, dateTime, label, money, pct, pctToBps, pricingText, toMoney } from '../../lib/format';
import { useAction, useLoad } from '../../lib/useLoad';
import type { GadgetRisk, MotorRisk, Plan, PricingRule, Product, ProductStatus, Quote } from '../../lib/types';
import { PageHeader } from '../../components/PortalShell';
import { Async, Banner, Button, Card, Empty, Field, KeyValues, Modal, Pill } from '../../components/ui';
import TermsFields from './TermsFields';
import { draftToTerms, termsToDraft } from './terms';

export default function ProductDetail() {
  const { id = '' } = useParams();
  const location = useLocation();
  const { isAdmin } = useSession();
  const product = useLoad(() => providerApi.product(id), [id]);
  const [editing, setEditing] = useState(false);
  const [addingPlan, setAddingPlan] = useState(false);
  const [quoting, setQuoting] = useState<Plan | null>(null);
  const [confirm, setConfirm] = useState<ProductStatus | null>(null);
  const [planBusy, setPlanBusy] = useState<string | null>(null);
  const action = useAction();
  const p = product.data;
  const set = (next: Product) => product.setData(() => next);

  const togglePlan = async (plan: Plan) => {
    if (!p) return;
    setPlanBusy(plan.id);
    const updated = await action.run(() => providerApi.setPlanActive(p.id, plan.id, !plan.active));
    if (updated) set({ ...p, plans: p.plans.map((x) => (x.id === updated.id ? updated : x)) });
    setPlanBusy(null);
  };

  const changeStatus = async (status: ProductStatus) => {
    if (!p) return;
    const updated = await action.run(() => providerApi.updateProduct(p.id, { status }));
    if (updated) set(updated);
    setConfirm(null);
  };

  return (
    <Async loading={product.loading && !p} error={product.error} onRetry={product.reload}>
      {p ? (
        <>
          <p className="ui-crumbs"><Link to="/provider/products">Products</Link> / {p.code}</p>
          <PageHeader
            eyebrow={`${label(p.type)} product`}
            title={p.name}
            actions={isAdmin ? <>
              {p.status === 'DRAFT' ? <Button onClick={() => setConfirm('ACTIVE')} disabled={!p.plans.some((x) => x.active)}>Activate</Button> : null}
              {p.status !== 'ARCHIVED' ? <Button variant="secondary" onClick={() => setEditing(true)}>Edit</Button> : null}
              {p.status !== 'ARCHIVED' ? <Button variant="danger" onClick={() => setConfirm('ARCHIVED')}>Archive</Button> : null}
            </> : null}
          />
          <div className="portal-actions ui-head-pills"><Pill value={p.status} /><code>{p.code}</code></div>

          {(location.state as { created?: boolean } | null)?.created && p.plans.length === 0
            ? <Banner tone="ok">Draft created. Next, add at least one plan, then activate the product.</Banner> : null}
          {p.status === 'DRAFT' && isAdmin ? (
            <Banner tone="info">
              {p.plans.some((x) => x.active)
                ? 'Step 3 of 3: this draft has an active plan. Activate it to show it to distributors. Terms lock once it is active.'
                : 'Step 2 of 3: add a plan. A product needs at least one active plan before it can be activated.'}
            </Banner>
          ) : null}
          {p.status === 'ARCHIVED' ? <Banner tone="info">This product is archived. It is hidden from distributors and cannot be reactivated.</Banner> : null}
          {action.error ? <Banner tone="error">{action.error}</Banner> : null}

          <div className="dashboard-grid two-col">
            <Card title="Details">
              <KeyValues rows={[
                ['Type', label(p.type)],
                ['Code', <code>{p.code}</code>],
                ['Default distributor commission', pct(p.defaultCommissionBps)],
                ['Created', dateTime(p.createdAt)],
              ]} />
            </Card>
            <Card title="Terms">
              <KeyValues rows={[
                ['Duration', `${p.terms.durationMonths} months`],
                ['Excess', pct(p.terms.excessBps)],
                ['Claim SLA', p.terms.claimSlaHours ? `${p.terms.claimSlaHours} hours` : '—'],
                ['Summary', p.terms.summary || '—'],
              ]} />
              <div className="terms-lists">
                <div><h3>Exclusions</h3>{p.terms.exclusions?.length ? <ul>{p.terms.exclusions.map((x) => <li key={x}>{x}</li>)}</ul> : <p>None listed</p>}</div>
                <div><h3>Claim documents</h3>{p.terms.claimDocuments?.length ? <ul>{p.terms.claimDocuments.map((x) => <li key={x}>{x}</li>)}</ul> : <p>None listed</p>}</div>
              </div>
            </Card>
          </div>

          <Card
            title="Plans"
            actions={isAdmin && p.status !== 'ARCHIVED' ? <Button onClick={() => setAddingPlan(true)}>Add plan</Button> : null}
          >
            <p className="ui-hint">Plans cannot be edited. To change a price or cover, add a new plan and deactivate the old one.</p>
            {p.plans.length === 0 ? <Empty title="No plans yet" /> : (
              <table className="portal-table">
                <thead><tr><th>Plan</th><th>Cover</th><th>Pricing</th><th>Instalments</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {p.plans.map((plan) => (
                    <tr key={plan.id}>
                      <td>{plan.name}</td>
                      <td>{money(plan.coverAmount)}</td>
                      <td>{pricingText(plan.pricingRule)}</td>
                      <td>{plan.installmentsOk ? 'Allowed' : 'No'}</td>
                      <td><Pill value={plan.active ? 'ACTIVE' : 'INACTIVE'} /></td>
                      <td className="ui-row-actions">
                        <Button variant="secondary" onClick={() => setQuoting(plan)}>Quote</Button>
                        {isAdmin && p.status !== 'ARCHIVED' ? (
                          <Button variant={plan.active ? 'ghost' : 'secondary'} busy={planBusy === plan.id} onClick={() => togglePlan(plan)}>
                            {plan.active ? 'Deactivate' : 'Activate'}
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {editing ? <EditProduct product={p} onClose={() => setEditing(false)} onSaved={(n) => { set(n); setEditing(false); }} /> : null}
          {addingPlan ? <AddPlan productId={p.id} onClose={() => setAddingPlan(false)} onAdded={(plan) => { set({ ...p, plans: [...p.plans, plan] }); setAddingPlan(false); }} /> : null}
          {quoting ? <QuotePreview product={p} plan={quoting} onClose={() => setQuoting(null)} /> : null}
          {confirm ? (
            <Modal title={confirm === 'ACTIVE' ? 'Activate this product?' : 'Archive this product?'} onClose={() => setConfirm(null)} footer={<>
              <Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button>
              <Button variant={confirm === 'ARCHIVED' ? 'danger' : 'primary'} busy={action.busy} onClick={() => changeStatus(confirm)}>
                {confirm === 'ACTIVE' ? 'Activate' : 'Archive'}
              </Button>
            </>}>
              <p>
                {confirm === 'ACTIVE'
                  ? 'Distributors will see it in the catalogue and can request access. Its terms lock: changing them later means creating a new product.'
                  : 'Archived products are hidden from distributors and cannot be brought back. Existing access grants are not changed.'}
              </p>
            </Modal>
          ) : null}
        </>
      ) : null}
    </Async>
  );
}

function EditProduct({ product, onClose, onSaved }: { product: Product; onClose: () => void; onSaved: (p: Product) => void }) {
  const draft = product.status === 'DRAFT';
  const [name, setName] = useState(product.name);
  const [commission, setCommission] = useState(bpsToPctInput(product.defaultCommissionBps));
  const [terms, setTerms] = useState(() => termsToDraft(product.terms));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const action = useAction();

  const save = async () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2 || name.trim().length > 120) e.name = 'Enter a name (2–120 characters).';
    let defaultCommissionBps: number | undefined;
    if (commission.trim()) {
      const v = pctToBps(commission);
      if (v === null) e.commission = 'Enter a percentage from 0 to 100.'; else defaultCommissionBps = v;
    }
    const t = draft ? draftToTerms(terms) : { errors: {}, terms: undefined };
    setErrors({ ...e, ...t.errors });
    if (Object.keys(e).length || Object.keys(t.errors).length) return;
    const body = {
      ...(name.trim() !== product.name ? { name: name.trim() } : {}),
      ...(defaultCommissionBps !== undefined && defaultCommissionBps !== product.defaultCommissionBps ? { defaultCommissionBps } : {}),
      ...(draft && t.terms ? { terms: t.terms } : {}),
    };
    if (!Object.keys(body).length) { onClose(); return; }
    const updated = await action.run(() => providerApi.updateProduct(product.id, body));
    if (updated) onSaved(updated);
  };

  return (
    <Modal wide title="Edit product" onClose={onClose} footer={<>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button busy={action.busy} onClick={save}>Save changes</Button>
    </>}>
      {action.error ? <Banner tone="error">{action.error}</Banner> : null}
      <div className="portal-form-grid">
        <Field label="Name" error={errors.name}><input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} /></Field>
        <Field label="Default distributor commission (%)" error={errors.commission} hint="Existing grants keep the commission they were approved with">
          <input inputMode="decimal" value={commission} onChange={(e) => setCommission(e.target.value)} />
        </Field>
      </div>
      <h3 className="ui-subhead">Terms</h3>
      {draft ? <TermsFields value={terms} onChange={setTerms} errors={errors} />
        : <Banner tone="info">Terms are locked because this product is active. To change them, create a new product.</Banner>}
    </Modal>
  );
}

function AddPlan({ productId, onClose, onAdded }: { productId: string; onClose: () => void; onAdded: (p: Plan) => void }) {
  const [f, setF] = useState({ name: '', cover: '', kind: 'FLAT' as PricingRule['kind'], premium: '', rate: '', min: '', max: '', installmentsOk: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const action = useAction();
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const submit = async () => {
    const e: Record<string, string> = {};
    if (f.name.trim().length < 2 || f.name.trim().length > 120) e.name = 'Enter a name (2–120 characters).';
    const coverAmount = toMoney(f.cover);
    if (!coverAmount) e.cover = 'Enter an amount, e.g. 5000000.';
    let pricingRule: PricingRule | undefined;
    if (f.kind === 'FLAT') {
      const premium = toMoney(f.premium);
      if (!premium) e.premium = 'Enter the premium, e.g. 45000.'; else pricingRule = { kind: 'FLAT', premium };
    } else {
      const rateBps = pctToBps(f.rate, 1, 10000);
      const min = f.min.trim() ? toMoney(f.min) : undefined;
      const max = f.max.trim() ? toMoney(f.max) : undefined;
      if (rateBps === null) e.rate = 'Enter a rate from 0.01 to 100.';
      if (min === null) e.min = 'Enter an amount or leave blank.';
      if (max === null) e.max = 'Enter an amount or leave blank.';
      if (min && max && Number(min) > Number(max)) e.max = 'Maximum must be at least the minimum.';
      if (rateBps !== null && min !== null && max !== null) {
        pricingRule = { kind: 'PERCENT_OF_VALUE', rateBps, ...(min ? { min } : {}), ...(max ? { max } : {}) };
      }
    }
    setErrors(e);
    if (Object.keys(e).length || !pricingRule || !coverAmount) return;
    const plan = await action.run(() => providerApi.addPlan(productId, { name: f.name.trim(), coverAmount, installmentsOk: f.installmentsOk, pricingRule: pricingRule! }));
    if (plan) onAdded(plan);
  };

  return (
    <Modal title="Add a plan" onClose={onClose} footer={<>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button busy={action.busy} onClick={submit}>Add plan</Button>
    </>}>
      <p className="ui-hint">Plans cannot be edited after you create them.</p>
      {action.error ? <Banner tone="error">{action.error}</Banner> : null}
      <div className="portal-form-grid">
        <Field label="Plan name" error={errors.name} full><input value={f.name} onChange={set('name')} maxLength={120} placeholder="Comprehensive 5M" /></Field>
        <Field label="Cover amount (₦)" error={errors.cover}><input inputMode="decimal" value={f.cover} onChange={set('cover')} placeholder="5000000" /></Field>
        <Field label="Pricing">
          <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as PricingRule['kind'] })}>
            <option value="FLAT">Flat premium</option>
            <option value="PERCENT_OF_VALUE">Percent of insured value</option>
          </select>
        </Field>
        {f.kind === 'FLAT' ? (
          <Field label="Premium (₦)" error={errors.premium}><input inputMode="decimal" value={f.premium} onChange={set('premium')} placeholder="45000" /></Field>
        ) : (
          <>
            <Field label="Rate (% of value)" error={errors.rate}><input inputMode="decimal" value={f.rate} onChange={set('rate')} placeholder="5" /></Field>
            <Field label="Minimum premium (₦) · optional" error={errors.min}><input inputMode="decimal" value={f.min} onChange={set('min')} placeholder="25000" /></Field>
            <Field label="Maximum premium (₦) · optional" error={errors.max}><input inputMode="decimal" value={f.max} onChange={set('max')} placeholder="400000" /></Field>
          </>
        )}
        <label className="ui-check portal-field-full">
          <input type="checkbox" checked={f.installmentsOk} onChange={(e) => setF({ ...f, installmentsOk: e.target.checked })} />
          Allow customers to pay in instalments
        </label>
      </div>
    </Modal>
  );
}

function QuotePreview({ product, plan, onClose }: { product: Product; plan: Plan; onClose: () => void }) {
  const motor = product.type === 'MOTOR';
  const [f, setF] = useState({ category: motor ? 'PRIVATE' : 'PHONE', value: '', year: String(new Date().getFullYear() - 2) });
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const action = useAction();

  const run = async () => {
    setError(null);
    const value = toMoney(f.value);
    if (!value) { setError('Enter the insured value, e.g. 3000000.'); return; }
    let risk: MotorRisk | GadgetRisk;
    if (motor) {
      const year = Number(f.year);
      if (!Number.isInteger(year) || year < 1980 || year > 2100) { setError('Enter a year between 1980 and 2100.'); return; }
      risk = { vehicleCategory: f.category as MotorRisk['vehicleCategory'], vehicleValue: value, yearOfManufacture: year };
    } else {
      risk = { deviceCategory: f.category as GadgetRisk['deviceCategory'], deviceValue: value };
    }
    const q = await action.run(() => providerApi.quote(product.id, plan.id, risk));
    if (q) setQuote(q);
  };

  return (
    <Modal title={`Quote preview · ${plan.name}`} onClose={onClose} footer={<>
      <Button variant="secondary" onClick={onClose}>Close</Button>
      <Button busy={action.busy} onClick={run}>Get quote</Button>
    </>}>
      <p className="ui-hint">Tests this plan’s pricing through the provider adapter. Nothing is sold or saved. {pricingText(plan.pricingRule)}.</p>
      {error || action.error ? <Banner tone="error">{error ?? action.error}</Banner> : null}
      <div className="portal-form-grid">
        <Field label={motor ? 'Vehicle category' : 'Device category'}>
          <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            {(motor ? ['PRIVATE', 'COMMERCIAL', 'MOTORCYCLE'] : ['PHONE', 'LAPTOP', 'TABLET', 'OTHER']).map((c) => <option key={c} value={c}>{label(c)}</option>)}
          </select>
        </Field>
        <Field label={motor ? 'Vehicle value (₦)' : 'Device value (₦)'}>
          <input inputMode="decimal" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} placeholder={motor ? '3000000' : '450000'} />
        </Field>
        {motor ? (
          <Field label="Year of manufacture">
            <input type="number" min={1980} max={2100} value={f.year} onChange={(e) => setF({ ...f, year: e.target.value })} />
          </Field>
        ) : null}
      </div>
      {quote ? (
        <div className="quote-result">
          <span>Premium</span>
          <strong>{money(quote.premium)}</strong>
          <KeyValues rows={[
            ['Cover', money(quote.coverAmount)],
            ['Duration', `${quote.durationMonths} months`],
            ['Valid until', dateTime(quote.validUntil)],
            ['Adapter', `${quote.adapterKey} · ${quote.adapterRef}`],
          ]} />
        </div>
      ) : null}
    </Modal>
  );
}
