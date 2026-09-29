import { useQuery } from '@tanstack/react-query';
import { Bot, CalendarCheck, CircleDollarSign, Store, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { axis, grid, SERIES, shortDay, tooltip } from '../components/charts';
import { Badge, Card, ErrorBox, PageHeader, Spinner, StatCard } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { money, num, STATUS } from '../lib/format';
import type { BookingStatus, Stats } from '../lib/types';

export function OverviewPage() {
  const stats = useQuery({ queryKey: ['stats'], queryFn: () => api<Stats>('/admin/stats'), refetchInterval: 60_000 });
  if (stats.isLoading) return <Spinner />;
  if (stats.error || !stats.data) return <ErrorBox message={errorMessage(stats.error)} />;
  const s = stats.data;

  const customers = s.users.CUSTOMER ?? 0;
  const providers = s.users.PROVIDER ?? 0;
  const statusRows = (Object.keys(STATUS) as BookingStatus[]).map((k) => ({ status: k, count: s.bookings.byStatus[k] ?? 0 }));
  const maxStatus = Math.max(1, ...statusRows.map((r) => r.count));
  const maxCategory = Math.max(1, ...s.topCategories.map((c) => c.bookings));

  return (
    <>
      <PageHeader title="Overview" subtitle="How FixMate is doing right now." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue (30 days)" value={money(s.revenue.last30Days)} hint={`All time ${money(s.revenue.allTime)}`} icon={<CircleDollarSign className="h-5 w-5" />} />
        <StatCard label="Bookings" value={num(s.bookings.total)} hint={`${s.bookings.completionRate}% completed`} icon={<CalendarCheck className="h-5 w-5" />} tone="blue" />
        <StatCard label="Users" value={num(customers + providers)} hint={`${num(customers)} customers · ${num(providers)} providers`} icon={<Users className="h-5 w-5" />} tone="violet" />
        <StatCard
          label="Providers verified"
          value={`${s.businesses.verified}/${s.businesses.total}`}
          hint={`${s.businesses.total - s.businesses.verified} waiting for review`}
          icon={<Store className="h-5 w-5" />}
          tone="amber"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="Bookings — last 14 days" className="xl:col-span-2">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s.bookings.daily} barGap={2} margin={{ left: -20, right: 8 }}>
                <CartesianGrid {...grid} />
                <XAxis dataKey="day" tickFormatter={shortDay} {...axis} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} {...axis} />
                <Tooltip {...tooltip} labelFormatter={(d) => shortDay(String(d))} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#475569' }} />
                <Bar dataKey="bookings" name="New bookings" fill={SERIES.primary} radius={[4, 4, 0, 0]} maxBarSize={18} />
                <Bar dataKey="completed" name="Completed" fill={SERIES.secondary} radius={[4, 4, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Bookings by status">
          <ul className="space-y-3">
            {statusRows.map((r) => (
              <li key={r.status}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
                  <span className="font-semibold text-slate-700 tabular-nums">{num(r.count)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100">
                  <div className="h-1.5 rounded-full bg-brand-600" style={{ width: `${(r.count / maxStatus) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Most booked categories">
          <ul className="space-y-3">
            {s.topCategories.map((c) => (
              <li key={c.slug} className="grid grid-cols-[8rem_1fr_2.5rem] items-center gap-3 text-sm">
                <span className="truncate text-slate-700">{c.name}</span>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-brand-600" style={{ width: `${(c.bookings / maxCategory) * 100}%` }} />
                </div>
                <span className="text-right font-semibold text-slate-700 tabular-nums">{c.bookings}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="AI assistant (30 days)" action={<Bot className="h-4 w-4 text-slate-400" />}>
          <dl className="grid grid-cols-2 gap-4">
            <Metric label="Requests" value={num(s.ai.requests30d)} />
            <Metric label="Success rate" value={`${s.ai.successRate}%`} />
            <Metric label="Tokens used" value={num(s.ai.inputTokens30d + s.ai.outputTokens30d)} />
            <Metric label="Avg. response" value={`${(s.ai.avgLatencyMs / 1000).toFixed(1)} s`} />
          </dl>
        </Card>
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-xl font-bold text-slate-900">{value}</dd>
    </div>
  );
}
