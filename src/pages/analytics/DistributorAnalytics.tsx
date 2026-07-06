import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { api } from '../../lib/api';

interface TrendPoint { month: string; count: number; commissions: string; }
interface TopProvider { provider__name: string; total_sold: number; }
interface TopPlan { plan__name: string; plan__category__name: string; total_sold: number; }

interface Summary {
  total_policies_facilitated: number;
  total_commissions_earned: string;
  total_customers: number;
}

const monthLabel = (ym: string) => {
  const [year, month] = ym.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short' });
};

const naira = (value: string | number) => `\u20A6${Number(value).toLocaleString()}`;

export default function DistributorAnalytics() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [topProviders, setTopProviders] = useState<TopProvider[]>([]);
  const [topPlans, setTopPlans] = useState<TopPlan[]>([]);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [summaryRes, trendsRes] = await Promise.all([
          api.get('/partner/analytics/distributor/summary/'),
          api.get('/partner/analytics/distributor/subscriptions-trends/'),
        ]);
        setSummary(summaryRes.data.summary);
        setTopProviders(summaryRes.data.top_providers);
        setTopPlans(summaryRes.data.top_plans);
        setTrends(trendsRes.data.trends);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="empty-state">Loading analytics...</div>;
  if (!summary) return <div className="empty-state">No analytics data available yet.</div>;

  const chartData = trends.map((t) => ({ ...t, label: monthLabel(t.month), commissions: Number(t.commissions) }));

  return (
    <>
      <div className="stat-row">
        <div className="stat-tile">
          <span className="stat-tile-label">Policies Facilitated</span>
          <span className="stat-tile-value">{summary.total_policies_facilitated.toLocaleString()}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile-label">Commissions Earned</span>
          <span className="stat-tile-value">{naira(summary.total_commissions_earned)}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile-label">Customers Reached</span>
          <span className="stat-tile-value">{summary.total_customers.toLocaleString()}</span>
        </div>
      </div>

      <div className="chart-card">
        <h2>Facilitation & Commissions over time</h2>
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
            <Line yAxisId="right" type="monotone" dataKey="commissions" stroke="#2F6FED" strokeWidth={2} name="Commissions (₦)" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="two-col">
        <div className="table-card">
          <h2>Top providers</h2>
          <table>
            <thead>
              <tr><th>Provider</th><th>Sold</th></tr>
            </thead>
            <tbody>
              {topProviders.map((row) => (
                <tr key={row.provider__name}>
                  <td>{row.provider__name}</td>
                  <td>{row.total_sold.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-card">
          <h2>Top plans</h2>
          <table>
            <thead>
              <tr><th>Plan</th><th>Category</th><th>Sold</th></tr>
            </thead>
            <tbody>
              {topPlans.map((row) => (
                <tr key={row.plan__name}>
                  <td>{row.plan__name}</td>
                  <td className="capitalize">{row.plan__category__name}</td>
                  <td>{row.total_sold.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
