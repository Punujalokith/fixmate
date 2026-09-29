import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Badge, ErrorBox, PageHeader, Pagination, SearchInput, Select, Table, Td } from '../components/ui';
import { api, errorMessage, qs } from '../lib/api';
import { dateTime } from '../lib/format';
import { useDebounced } from '../lib/hooks';
import type { AuditLog, Paginated } from '../lib/types';

export function AuditPage() {
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounced(action);

  const logs = useQuery({
    queryKey: ['audit', search, entityType, page],
    queryFn: () => api<Paginated<AuditLog>>(`/admin/audit-logs${qs({ action: search, entityType, page, limit: 30 })}`),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        title="Audit log"
        subtitle="Who did what, and when. Important and admin actions are recorded here."
        actions={
          <>
            <SearchInput placeholder="Action, e.g. user.suspend" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} />
            <Select value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }} aria-label="Entity">
              <option value="">All entities</option>
              {['User', 'Business', 'Booking', 'Review', 'Category'].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </>
        }
      />
      {logs.error ? <ErrorBox message={errorMessage(logs.error)} /> : null}
      <Table head={['When', 'Who', 'Action', 'Target', 'Details', 'IP']} empty={logs.data?.data.length === 0}>
        {logs.data?.data.map((l) => (
          <tr key={l.id} className="hover:bg-slate-50">
            <Td className="whitespace-nowrap text-slate-500">{dateTime(l.createdAt)}</Td>
            <Td>
              {l.actor ? (
                <>
                  <p>{l.actor.fullName}</p>
                  <p className="text-xs text-slate-500">{l.actor.role.toLowerCase()}</p>
                </>
              ) : (
                <span className="text-slate-400">system</span>
              )}
            </Td>
            <Td>
              <Badge tone={l.action.includes('suspend') || l.action.includes('reuse') || l.action.includes('hide') ? 'red' : 'teal'}>{l.action}</Badge>
            </Td>
            <Td className="text-xs">
              {l.entityType}
              <p className="font-mono text-slate-400">{l.entityId?.slice(0, 8)}</p>
            </Td>
            <Td className="max-w-xs font-mono text-xs text-slate-500">
              <p className="truncate" title={l.metadata ? JSON.stringify(l.metadata) : ''}>
                {l.metadata ? JSON.stringify(l.metadata) : '—'}
              </p>
            </Td>
            <Td className="font-mono text-xs text-slate-400">{l.ip ?? '—'}</Td>
          </tr>
        ))}
      </Table>
      {logs.data ? <Pagination {...logs.data.meta} onChange={setPage} /> : null}
    </>
  );
}
