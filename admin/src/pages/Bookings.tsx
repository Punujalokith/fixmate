import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Badge, Button, ErrorBox, PageHeader, Pagination, SearchInput, Select, Table, Td } from '../components/ui';
import { api, errorMessage, qs } from '../lib/api';
import { dateTime, money, STATUS } from '../lib/format';
import { useDebounced } from '../lib/hooks';
import type { AdminBooking, BookingStatus, Paginated } from '../lib/types';

const CANCELLABLE: BookingStatus[] = ['PENDING', 'ACCEPTED', 'IN_PROGRESS'];

export function BookingsPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounced(q);

  const bookings = useQuery({
    queryKey: ['admin-bookings', search, status, page],
    queryFn: () => api<Paginated<AdminBooking>>(`/admin/bookings${qs({ q: search, status, page, limit: 20 })}`),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });

  const cancel = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api(`/bookings/${id}/cancel`, { method: 'POST', body: { reason } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-bookings'] }),
    onError: (e) => alert(errorMessage(e)),
  });

  return (
    <>
      <PageHeader
        title="Bookings"
        subtitle="Every booking on the platform. Admins can cancel any active booking."
        actions={
          <>
            <SearchInput placeholder="Code or service" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Status">
              <option value="">All statuses</option>
              {(Object.keys(STATUS) as BookingStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS[s].label}
                </option>
              ))}
            </Select>
          </>
        }
      />
      {bookings.error ? <ErrorBox message={errorMessage(bookings.error)} /> : null}
      <Table head={['Booking', 'Customer', 'Provider', 'Scheduled', 'Amount', 'Status', '']} empty={bookings.data?.data.length === 0}>
        {bookings.data?.data.map((b) => (
          <tr key={b.id} className="hover:bg-slate-50">
            <Td>
              <p className="font-mono text-xs text-slate-500">{b.code}</p>
              <p className="font-medium text-slate-900">{b.serviceTitle}</p>
            </Td>
            <Td>
              <p>{b.customer.fullName}</p>
              <p className="text-xs text-slate-500">{b.city}</p>
            </Td>
            <Td>{b.business.name}</Td>
            <Td className="whitespace-nowrap text-slate-600">{dateTime(b.scheduledAt)}</Td>
            <Td className="tabular-nums">
              {money(b.price)}
              {b.payment?.status === 'PAID' ? <p className="text-xs text-emerald-600">Paid</p> : null}
            </Td>
            <Td>
              <Badge tone={STATUS[b.status].tone}>{STATUS[b.status].label}</Badge>
            </Td>
            <Td className="text-right">
              {CANCELLABLE.includes(b.status) ? (
                <Button
                  size="sm"
                  variant="danger"
                  loading={cancel.isPending && cancel.variables?.id === b.id}
                  onClick={() => {
                    const reason = prompt(`Cancel ${b.code}? Both sides will be notified.\n\nReason:`);
                    if (reason && reason.trim().length >= 3) cancel.mutate({ id: b.id, reason: reason.trim() });
                  }}
                >
                  Cancel
                </Button>
              ) : null}
            </Td>
          </tr>
        ))}
      </Table>
      {bookings.data ? <Pagination {...bookings.data.meta} onChange={setPage} /> : null}
    </>
  );
}
