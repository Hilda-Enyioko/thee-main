import { useState } from 'react';
import { Link } from 'react-router-dom';
import { distributorApi } from '../../lib/api';
import { dateTime, label, pct } from '../../lib/format';
import { useLoad } from '../../lib/useLoad';
import type { GrantStatus } from '../../lib/types';
import { PageHeader } from '../../components/PortalShell';
import { Async, Card, Empty, PageIntro, Pager, Pill, Tabs } from '../../components/ui';

type Filter = GrantStatus | 'ALL';

export default function MyRequests() {
  const [status, setStatus] = useState<Filter>('ALL');
  const [page, setPage] = useState(1);
  const list = useLoad(() => distributorApi.accessRequests({ status: status === 'ALL' ? undefined : status, page, limit: 20 }), [status, page]);

  return (
    <>
      <PageHeader eyebrow="Distribution" title="My access requests" />
      <PageIntro>Every product you have asked to sell, and each provider’s answer. You can sell a product once it is approved.</PageIntro>
      <Tabs value={status} onChange={(s) => { setStatus(s); setPage(1); }} options={[
        { value: 'ALL', label: 'All' },
        { value: 'PENDING', label: 'Pending' },
        { value: 'APPROVED', label: 'Approved' },
        { value: 'REJECTED', label: 'Rejected' },
        { value: 'REVOKED', label: 'Revoked' },
      ]} />
      <Card>
        <Async loading={list.loading && !list.data} error={list.error} onRetry={list.reload}>
          {list.data?.items.length ? (
            <>
              <table className="portal-table">
                <thead><tr><th>Product</th><th>Provider</th><th>Requested</th><th>Status</th><th>Commission</th><th>Provider note</th></tr></thead>
                <tbody>
                  {list.data.items.map((g) => (
                    <tr key={g.id}>
                      <td>{g.product.name}<small className="ui-sub">{label(g.product.type)}</small></td>
                      <td>{g.provider?.name ?? '—'}</td>
                      <td>{dateTime(g.createdAt)}</td>
                      <td><Pill value={g.status} text={g.status === 'PENDING' ? 'Awaiting provider' : undefined} /></td>
                      <td>{g.status === 'APPROVED' ? pct(g.commissionBps) : '—'}</td>
                      <td>{g.reviewNote ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pager page={page} limit={list.data.limit} total={list.data.total} onPage={setPage} />
            </>
          ) : (
            <Empty title="No requests yet"><Link to="/distributor/catalogue">Browse the catalogue</Link></Empty>
          )}
        </Async>
      </Card>
    </>
  );
}
