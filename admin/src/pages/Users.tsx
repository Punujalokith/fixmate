import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Avatar, Badge, Button, ErrorBox, PageHeader, Pagination, SearchInput, Select, Table, Td } from '../components/ui';
import { api, errorMessage, qs } from '../lib/api';
import { dateOnly, dateTime } from '../lib/format';
import { useDebounced } from '../lib/hooks';
import type { Paginated, User } from '../lib/types';

export function UsersPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounced(q);

  const users = useQuery({
    queryKey: ['admin-users', search, role, status, page],
    queryFn: () => api<Paginated<User>>(`/admin/users${qs({ q: search, role, status, page, limit: 20 })}`),
    placeholderData: keepPreviousData,
  });

  const setUserStatus = useMutation({
    mutationFn: ({ id, next, reason }: { id: string; next: 'ACTIVE' | 'SUSPENDED'; reason?: string }) =>
      api(`/admin/users/${id}/status`, { method: 'PATCH', body: { status: next, reason } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (e) => alert(errorMessage(e)),
  });

  const toggle = (u: User) => {
    if (u.status === 'ACTIVE') {
      const reason = prompt(`Suspend ${u.fullName}? They will be logged out.\n\nReason:`);
      if (reason === null) return;
      setUserStatus.mutate({ id: u.id, next: 'SUSPENDED', reason: reason || undefined });
    } else setUserStatus.mutate({ id: u.id, next: 'ACTIVE' });
  };

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Customers, providers and admins."
        actions={
          <>
            <SearchInput placeholder="Name, email or phone" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
            <Select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} aria-label="Role">
              <option value="">All roles</option>
              <option value="CUSTOMER">Customers</option>
              <option value="PROVIDER">Providers</option>
              <option value="ADMIN">Admins</option>
            </Select>
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Status">
              <option value="">Any status</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </Select>
          </>
        }
      />
      {users.error ? <ErrorBox message={errorMessage(users.error)} /> : null}
      <Table head={['User', 'Role', 'Status', 'Bookings', 'Joined', 'Last login', '']} empty={users.data?.data.length === 0}>
        {users.data?.data.map((u) => (
          <tr key={u.id} className="hover:bg-slate-50">
            <Td>
              <div className="flex items-center gap-3">
                <Avatar name={u.fullName} />
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{u.fullName}</p>
                  <p className="truncate text-xs text-slate-500">{u.email}{u.phone ? ` · ${u.phone}` : ''}</p>
                </div>
              </div>
            </Td>
            <Td>
              <Badge tone={u.role === 'ADMIN' ? 'violet' : u.role === 'PROVIDER' ? 'blue' : 'slate'}>{u.role.toLowerCase()}</Badge>
              {u.business ? <p className="mt-1 text-xs text-slate-500">{u.business.name}</p> : null}
            </Td>
            <Td>{u.status === 'ACTIVE' ? <Badge tone="green">Active</Badge> : <Badge tone="red">Suspended</Badge>}</Td>
            <Td className="tabular-nums">{u._count?.bookings ?? 0}</Td>
            <Td className="text-slate-500">{dateOnly(u.createdAt)}</Td>
            <Td className="text-slate-500">{u.lastLoginAt ? dateTime(u.lastLoginAt) : '—'}</Td>
            <Td className="text-right">
              {u.role !== 'ADMIN' ? (
                <Button size="sm" variant={u.status === 'ACTIVE' ? 'danger' : 'secondary'} onClick={() => toggle(u)} loading={setUserStatus.isPending && setUserStatus.variables?.id === u.id}>
                  {u.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                </Button>
              ) : null}
            </Td>
          </tr>
        ))}
      </Table>
      {users.data ? <Pagination {...users.data.meta} onChange={setPage} /> : null}
    </>
  );
}
