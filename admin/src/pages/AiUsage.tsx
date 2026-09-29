import { useQuery } from '@tanstack/react-query';
import { Activity, Clock, Cpu, MessageSquare } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { axis, grid, SERIES, shortDay, tooltip } from '../components/charts';
import { Badge, Card, ErrorBox, PageHeader, Spinner, StatCard, Table, Td } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { dateTime, num } from '../lib/format';
import type { AiUsage } from '../lib/types';

export function AiUsagePage() {
  const usage = useQuery({ queryKey: ['ai-usage'], queryFn: () => api<AiUsage>('/admin/ai-usage') });
  const status = useQuery({ queryKey: ['ai-status'], queryFn: () => api<{ mode: 'ai' | 'fallback' }>('/ai/status') });

  if (usage.isLoading) return <Spinner />;
  if (usage.error || !usage.data) return <ErrorBox message={errorMessage(usage.error)} />;
  const u = usage.data;

  return (
    <>
      <PageHeader
        title="AI usage"
        subtitle="The AI service assistant classifies customer problems. Every call is logged here."
        actions={
          status.data ? (
            status.data.mode === 'ai' ? <Badge tone="green">Claude connected</Badge> : <Badge tone="amber">Offline fallback (no API key)</Badge>
          ) : null
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Requests (30 days)" value={num(u.requests30d)} icon={<MessageSquare className="h-5 w-5" />} />
        <StatCard label="Success rate" value={`${u.successRate}%`} icon={<Activity className="h-5 w-5" />} tone="green" />
        <StatCard label="Tokens (in / out)" value={num(u.inputTokens30d + u.outputTokens30d)} hint={`${num(u.inputTokens30d)} in · ${num(u.outputTokens30d)} out`} icon={<Cpu className="h-5 w-5" />} tone="violet" />
        <StatCard label="Avg. response time" value={`${(u.avgLatencyMs / 1000).toFixed(2)} s`} icon={<Clock className="h-5 w-5" />} tone="blue" />
      </div>

      <Card title="Requests per day" className="mt-6">
        {u.daily.length ? (
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={u.daily} margin={{ left: -20, right: 8 }}>
                <CartesianGrid {...grid} />
                <XAxis dataKey="day" tickFormatter={shortDay} {...axis} />
                <YAxis allowDecimals={false} {...axis} />
                <Tooltip {...tooltip} labelFormatter={(d) => shortDay(String(d))} />
                <Bar dataKey="requests" name="Requests" fill={SERIES.primary} radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-slate-500">No AI requests yet.</p>
        )}
      </Card>

      <h2 className="mt-8 mb-3 text-sm font-semibold text-slate-700">Recent requests</h2>
      <Table head={['When', 'Customer', 'Message', 'Result', 'Tokens', 'Latency', 'Status']} empty={u.recent.length === 0}>
        {u.recent.map((r) => (
          <tr key={r.id} className="hover:bg-slate-50">
            <Td className="whitespace-nowrap text-slate-500">{dateTime(r.createdAt)}</Td>
            <Td>{r.user.fullName}</Td>
            <Td className="max-w-xs">
              <p className="truncate" title={r.input}>{r.input}</p>
            </Td>
            <Td className="text-xs">
              {r.output?.category_slug ?? '—'}
              {r.output?.urgency ? <span className="text-slate-400"> · {r.output.urgency}</span> : null}
            </Td>
            <Td className="tabular-nums">{r.inputTokens + r.outputTokens}</Td>
            <Td className="tabular-nums">{r.latencyMs} ms</Td>
            <Td>{r.success ? <Badge tone="green">OK</Badge> : <Badge tone="red">{r.errorMessage?.slice(0, 30) ?? 'Failed'}</Badge>}</Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
