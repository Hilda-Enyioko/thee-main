import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { api } from '../../lib/api';

interface TrendPoint { month: string; count: number; revenue: string; }
interface StatusBreakdown { status: string; count: number; }
interface TopPlan { plan__name: string; total_sold: number; revenue: string; }
interface DistributorBreakdown { distributor__name: string; total_sold: number; commission: string; }

interface Summary {
  total_policies: number;
  total_revenue: string;
  total_payout: string;
}

const monthLabel = (ym: string) => {
  const [year, month] = ym.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short' });
};

const naira = (value: string | number) => `\u20A6${Number(value).toLocaleString()}`;

export default function ProviderAnalytics() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown[]>([]);
  const [topPlans, setTopPlans] = useState<TopPlan[]>([]);
  const [distributorBreakdown, setDistributorBreakdown] = useState<DistributorBreakdown[]>([]);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [summaryRes, trendsRes] = await Promise.all([
          api.get('/partner/analytics/provider/summary/'),
          api.get('/partner/analytics/provider/subscriptions-trends/'),
        ]);
        setSummary(summaryRes.data.summary);
        setStatusBreakdown(summaryRes.data.status_breakdown);
        setTopPlans(summaryRes.data.top_plans);
        setDistributorBreakdown(summaryRes.data.distributor_breakdown);
        setTrends(trendsRes.data.trends);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="empty-state">Loading analytics...</div>;
  if (!summary) return <div className="empty-state">No analytics data available yet.</div>;

  const chartData = trends.map((t) => ({ ...t, label: monthLabel(t.month), revenue: Number(t.revenue) }));

  return (
    <>
      <div className="stat-row">
        <div className="stat-tile">
          <span className="stat-tile-label">Total Policies</span>
          <span className="stat-tile-value">{summary.total_policies.toLocaleString()}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile-label">Total Revenue</span>
          <span className="stat-tile-value">{naira(summary.total_revenue)}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile-label">Total Payout</span>
          <span className="stat-tile-value">{naira(summary.total_payout)}</span>
        </div>
      </div>

      <div className="chart-card">
        <h2>Subscriptions & Revenue over time</h2>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="label" stroke="var(--mist)" fontSize={12} />
            <YAxis yAxisId="left" stroke="var(--mist)" fontSize={12} />
            <YAxis yAxisId="right" orientation="right" stroke="var(--mist)" fontSize={12} />
            <Tooltip
              contentStyle={{ background: 'var(--deep-blue)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6 }}
              labelStyle={{ color: 'var(--paper)' }}
            />
            <Line yAxisId="left" type="monotone" dataKey="count" stroke="#6FA8FF" strokeWidth={2} name="Policies" dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#2F6FED" strokeWidth={2} name="Revenue (₦)" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="two-col">
        <div className="table-card">
          <h2>Status breakdown</h2>
          <table>
            <thead>
              <tr><th>Status</th><th>Count</th></tr>
            </thead>
            <tbody>
              {statusBreakdown.map((row) => (
                <tr key={row.status}>
                  <td className="capitalize">{row.status.replace('_', ' ')}</td>
                  <td>{row.count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-card">
          <h2>Top plans</h2>
          <table>
            <thead>
              <tr><th>Plan</th><th>Sold</th><th>Revenue</th></tr>
            </thead>
            <tbody>
              {topPlans.map((row) => (
                <tr key={row.plan__name}>
                  <td>{row.plan__name}</td>
                  <td>{row.total_sold.toLocaleString()}</td>
                  <td>{naira(row.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="table-card">
        <h2>Distributor breakdown</h2>
        <table>
          <thead>
            <tr><th>Distributor</th><th>Sold</th><th>Commission</th></tr>
          </thead>
          <tbody>
            {distributorBreakdown.map((row) => (
              <tr key={row.distributor__name}>
                <td>{row.distributor__name}</td>
                <td>{row.total_sold.toLocaleString()}</td>
                <td>{naira(row.commission)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
