import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Star } from 'lucide-react';
import { useState } from 'react';
import { Avatar, Badge, Button, ErrorBox, PageHeader, Pagination, SearchInput, Select, Table, Td } from '../components/ui';
import { api, errorMessage, qs } from '../lib/api';
import { dateOnly } from '../lib/format';
import { useDebounced } from '../lib/hooks';
import type { AdminBusiness, Paginated } from '../lib/types';

export function ProvidersPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [verified, setVerified] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounced(q);

  const businesses = useQuery({
    queryKey: ['admin-businesses', search, verified, page],
    queryFn: () => api<Paginated<AdminBusiness>>(`/admin/businesses${qs({ q: search, verified, page, limit: 20 })}`),
    placeholderData: keepPreviousData,
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { isVerified?: boolean; isActive?: boolean } }) => api(`/admin/businesses/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (e) => alert(errorMessage(e)),
  });

  return (
    <>
      <PageHeader
        title="Providers"
        subtitle="Verify new businesses and hide ones that break the rules."
        actions={
          <>
            <SearchInput placeholder="Business, city or owner email" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
            <Select value={verified} onChange={(e) => { setVerified(e.target.value); setPage(1); }} aria-label="Verification">
              <option value="">All</option>
              <option value="false">Waiting for verification</option>
              <option value="true">Verified</option>
            </Select>
          </>
        }
      />
      {businesses.error ? <ErrorBox message={errorMessage(businesses.error)} /> : null}
      <Table head={['Business', 'Owner', 'Rating', 'Services', 'Jobs', 'Status', '']} empty={businesses.data?.data.length === 0}>
        {businesses.data?.data.map((b) => (
          <tr key={b.id} className="hover:bg-slate-50">
            <Td>
              <div className="flex items-center gap-3">
                <Avatar name={b.name} />
                <div>
                  <p className="flex items-center gap-1 font-medium text-slate-900">
                    {b.name}
                    {b.isVerified ? <BadgeCheck className="h-4 w-4 text-blue-600" aria-label="Verified" /> : null}
                  </p>
                  <p className="text-xs text-slate-500">{b.city} · joined {dateOnly(b.createdAt)}</p>
                </div>
              </div>
            </Td>
            <Td>
              <p className="text-slate-900">{b.owner.fullName}</p>
              <p className="text-xs text-slate-500">{b.owner.email}</p>
            </Td>
            <Td>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {b.ratingCount ? b.ratingAvg.toFixed(1) : '—'} <span className="text-xs text-slate-400">({b.ratingCount})</span>
              </span>
            </Td>
            <Td className="tabular-nums">{b._count.services}</Td>
            <Td className="tabular-nums">{b.completedJobs}</Td>
            <Td>
              <div className="flex flex-wrap gap-1">
                {b.isVerified ? <Badge tone="blue">Verified</Badge> : <Badge tone="amber">Unverified</Badge>}
                {!b.isActive ? <Badge tone="red">Hidden</Badge> : null}
              </div>
            </Td>
            <Td className="text-right whitespace-nowrap">
              <div className="flex justify-end gap-2">
                <Button size="sm" variant={b.isVerified ? 'secondary' : 'primary'} onClick={() => update.mutate({ id: b.id, body: { isVerified: !b.isVerified } })}>
                  {b.isVerified ? 'Unverify' : 'Verify'}
                </Button>
                <Button
                  size="sm"
                  variant={b.isActive ? 'danger' : 'secondary'}
                  onClick={() => (b.isActive ? confirm(`Hide ${b.name} from customers?`) : true) && update.mutate({ id: b.id, body: { isActive: !b.isActive } })}
                >
                  {b.isActive ? 'Hide' : 'Show'}
                </Button>
              </div>
            </Td>
          </tr>
        ))}
      </Table>
      {businesses.data ? <Pagination {...businesses.data.meta} onChange={setPage} /> : null}
    </>
  );
}
