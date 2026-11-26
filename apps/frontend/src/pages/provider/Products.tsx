import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { providerApi } from '../../lib/api';
import { date, label, pct, pctToBps } from '../../lib/format';
import { useAction, useLoad } from '../../lib/useLoad';
import type { ProductStatus, ProductType } from '../../lib/types';
import { PageHeader } from '../../components/PortalShell';
import { Async, Banner, Button, Card, Empty, Field, PageIntro, Pill, Tabs } from '../../components/ui';
import TermsFields from './TermsFields';
import { draftToTerms, emptyTerms } from './terms';

export default function Products() {
  const { isAdmin } = useSession();
  const products = useLoad(() => providerApi.products(), []);
  const [filter, setFilter] = useState<'ALL' | ProductStatus>('ALL');
  const list = (products.data ?? []).filter((p) => filter === 'ALL' || p.status === filter);
  const count = (s: ProductStatus) => (products.data ?? []).filter((p) => p.status === s).length;

  return (
    <>
      <PageHeader eyebrow="Catalogue" title="Products" actions={isAdmin ? <Link className="portal-button" to="/provider/products/new">New product</Link> : null} />
      <PageIntro>
        A product is a Motor or Gadget cover with its terms and plans. Create it as a draft, add plans, then activate it so
        distributors can request access.
      </PageIntro>
      <Tabs value={filter} onChange={setFilter} options={[
        { value: 'ALL', label: 'All', count: products.data?.length },
        { value: 'ACTIVE', label: 'Active', count: count('ACTIVE') },
        { value: 'DRAFT', label: 'Draft', count: count('DRAFT') },
        { value: 'ARCHIVED', label: 'Archived', count: count('ARCHIVED') },
      ]} />
      <Card>
        <Async loading={products.loading} error={products.error} onRetry={products.reload}>
          {list.length === 0 ? (
            <Empty title={filter === 'ALL' ? 'No products yet' : `No ${label(filter).toLowerCase()} products`}>
              {isAdmin && filter === 'ALL' ? <Link to="/provider/products/new">Create your first product</Link> : null}
            </Empty>
          ) : (
            <table className="portal-table">
              <thead><tr><th>Name</th><th>Code</th><th>Type</th><th>Active plans</th><th>Commission</th><th>Status</th><th>Created</th></tr></thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id}>
                    <td><Link to={`/provider/products/${p.id}`}>{p.name}</Link></td>
                    <td><code>{p.code}</code></td>
                    <td>{label(p.type)}</td>
                    <td>{p.plans.filter((x) => x.active).length} of {p.plans.length}</td>
                    <td>{pct(p.defaultCommissionBps)}</td>
                    <td><Pill value={p.status} /></td>
                    <td>{date(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Async>
      </Card>
    </>
  );
}

const CODE_RE = /^[A-Z0-9][A-Z0-9_-]{1,39}$/;

export function NewProduct() {
  const navigate = useNavigate();
  const [type, setType] = useState<ProductType>('MOTOR');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [commission, setCommission] = useState('');
  const [terms, setTerms] = useState(emptyTerms);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const action = useAction();

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!CODE_RE.test(code)) e.code = '2–40 characters: A–Z, 0–9, _ or -, starting with a letter or digit.';
    if (name.trim().length < 2 || name.trim().length > 120) e.name = 'Enter a name (2–120 characters).';
    let defaultCommissionBps: number | undefined;
    if (commission.trim()) {
      const v = pctToBps(commission);
      if (v === null) e.commission = 'Enter a percentage from 0 to 100.'; else defaultCommissionBps = v;
    }
    const t = draftToTerms(terms);
    setErrors({ ...e, ...t.errors });
    if (Object.keys(e).length || !t.terms) return;
    const product = await action.run(() => providerApi.createProduct({
      type, code, name: name.trim(), terms: t.terms!, ...(defaultCommissionBps !== undefined ? { defaultCommissionBps } : {}),
    }));
    if (product) navigate(`/provider/products/${product.id}`, { replace: true, state: { created: true } });
  };

  return (
    <>
      <PageHeader eyebrow="Products · Step 1 of 3" title="New product" />
      <PageIntro>Create the product as a draft. You add plans and activate it on the next screen. Terms can only change while it is a draft.</PageIntro>
      {action.error ? <Banner tone="error">{action.error}</Banner> : null}
      <div className="dashboard-grid">
        <Card title="Product">
          <div className="portal-form-grid">
            <Field label="Type">
              <select value={type} onChange={(e) => setType(e.target.value as ProductType)}>
                <option value="MOTOR">Motor</option>
                <option value="GADGET">Gadget</option>
              </select>
            </Field>
            <Field label="Code" error={errors.code} hint="Unique within your products, e.g. MOTOR-COMP">
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, '-'))} maxLength={40} placeholder="MOTOR-COMP" />
            </Field>
            <Field label="Name" error={errors.name}>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Comprehensive Motor" />
            </Field>
            <Field label="Default distributor commission (%) · optional" error={errors.commission} hint="Prefilled when you approve a distributor">
              <input inputMode="decimal" value={commission} onChange={(e) => setCommission(e.target.value)} placeholder="15" />
            </Field>
          </div>
        </Card>
        <Card title="Terms">
          <TermsFields value={terms} onChange={setTerms} errors={errors} />
        </Card>
      </div>
      <div className="portal-actions">
        <Button busy={action.busy} onClick={submit}>Create draft</Button>
        <Link className="portal-button secondary" to="/provider/products">Cancel</Link>
      </div>
    </>
  );
}
