import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Badge, Button, Card, ErrorBox, Input, PageHeader, Table, Td } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import type { Category } from '../lib/types';

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: ['admin-categories'], queryFn: () => api<Category[]>('/admin/categories') });
  const [form, setForm] = useState({ name: '', icon: '', description: '' });
  const [error, setError] = useState('');
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-categories'] });

  const create = useMutation({
    mutationFn: () =>
      api('/admin/categories', {
        method: 'POST',
        body: {
          name: form.name.trim(),
          slug: slugify(form.name),
          icon: form.icon.trim() || undefined,
          description: form.description.trim() || undefined,
          sortOrder: categories.data?.length ?? 0,
        },
      }),
    onSuccess: () => {
      setForm({ name: '', icon: '', description: '' });
      refresh();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const toggle = useMutation({
    mutationFn: (c: Category) => api(`/admin/categories/${c.id}`, { method: 'PATCH', body: { isActive: !c.isActive } }),
    onSuccess: refresh,
    onError: (e) => alert(errorMessage(e)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    create.mutate();
  };

  return (
    <>
      <PageHeader title="Categories" subtitle="The service types customers can browse. Hidden categories disappear from the app." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {categories.error ? <ErrorBox message={errorMessage(categories.error)} /> : null}
          <Table head={['Name', 'Slug', 'Icon', 'Services', 'Status', '']}>
            {categories.data?.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <Td>
                  <p className="font-medium text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.description}</p>
                </Td>
                <Td className="font-mono text-xs text-slate-500">{c.slug}</Td>
                <Td className="font-mono text-xs text-slate-500">{c.icon ?? '—'}</Td>
                <Td className="tabular-nums">{c._count.services}</Td>
                <Td>{c.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="slate">Hidden</Badge>}</Td>
                <Td className="text-right">
                  <Button size="sm" variant="secondary" onClick={() => toggle.mutate(c)}>
                    {c.isActive ? 'Hide' : 'Show'}
                  </Button>
                </Td>
              </tr>
            ))}
          </Table>
        </div>
        <Card title="Add a category">
          <form onSubmit={submit} className="space-y-3">
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Gardening" required minLength={2} />
            <p className="text-xs text-slate-500">Slug: {slugify(form.name) || '—'}</p>
            <Input label="Icon (Ionicons name)" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="leaf" />
            <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Lawn mowing, hedge trimming…" />
            {error ? <ErrorBox message={error} /> : null}
            <Button type="submit" loading={create.isPending} disabled={form.name.trim().length < 2} className="w-full">
              Add category
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
