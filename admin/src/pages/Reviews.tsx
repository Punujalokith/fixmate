import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Card, ErrorBox, PageHeader, Pagination, Select, Spinner } from '../components/ui';
import { api, errorMessage, qs } from '../lib/api';
import { dateOnly } from '../lib/format';
import type { AdminReview, Paginated } from '../lib/types';

export function ReviewsPage() {
  const queryClient = useQueryClient();
  const [hidden, setHidden] = useState('');
  const [maxRating, setMaxRating] = useState('');
  const [page, setPage] = useState(1);

  const reviews = useQuery({
    queryKey: ['admin-reviews', hidden, maxRating, page],
    queryFn: () => api<Paginated<AdminReview>>(`/admin/reviews${qs({ hidden, maxRating, page, limit: 20 })}`),
    placeholderData: keepPreviousData,
  });

  const moderate = useMutation({
    mutationFn: ({ id, isHidden }: { id: string; isHidden: boolean }) => api(`/admin/reviews/${id}`, { method: 'PATCH', body: { isHidden } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-reviews'] }),
    onError: (e) => alert(errorMessage(e)),
  });

  return (
    <>
      <PageHeader
        title="Reviews"
        subtitle="Hide abusive or fake reviews. The provider's rating is recalculated automatically."
        actions={
          <>
            <Select value={maxRating} onChange={(e) => { setMaxRating(e.target.value); setPage(1); }} aria-label="Rating">
              <option value="">Any rating</option>
              <option value="2">2★ and below</option>
              <option value="3">3★ and below</option>
            </Select>
            <Select value={hidden} onChange={(e) => { setHidden(e.target.value); setPage(1); }} aria-label="Visibility">
              <option value="">Visible & hidden</option>
              <option value="false">Visible</option>
              <option value="true">Hidden</option>
            </Select>
          </>
        }
      />
      {reviews.isLoading ? <Spinner /> : null}
      {reviews.error ? <ErrorBox message={errorMessage(reviews.error)} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {reviews.data?.data.map((r) => (
          <Card key={r.id} className={r.isHidden ? 'opacity-60' : ''}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-0.5" aria-label={`${r.rating} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={n <= r.rating ? 'h-4 w-4 fill-amber-400 text-amber-400' : 'h-4 w-4 text-slate-300'} />
                  ))}
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-900">{r.business.name}</p>
                <p className="text-xs text-slate-500">
                  {r.customer.fullName} · {r.booking.serviceTitle} · {dateOnly(r.createdAt)}
                </p>
              </div>
              {r.isHidden ? <Badge tone="red">Hidden</Badge> : <Badge tone="green">Visible</Badge>}
            </div>
            <p className="mt-3 text-sm text-slate-700">{r.comment || <span className="text-slate-400 italic">No comment</span>}</p>
            {r.providerReply ? <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">Reply: {r.providerReply}</p> : null}
            <div className="mt-4 flex justify-end">
              <Button
                size="sm"
                variant={r.isHidden ? 'secondary' : 'danger'}
                loading={moderate.isPending && moderate.variables?.id === r.id}
                onClick={() => moderate.mutate({ id: r.id, isHidden: !r.isHidden })}
              >
                {r.isHidden ? 'Show again' : 'Hide review'}
              </Button>
            </div>
          </Card>
        ))}
      </div>
      {reviews.data?.data.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">No reviews match these filters.</p> : null}
      {reviews.data ? <Pagination {...reviews.data.meta} onChange={setPage} /> : null}
    </>
  );
}
