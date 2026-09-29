// Marketplace search and the full booking lifecycle.
import { bearer, createProviderWithService, createTestApp, hoursFromNow, registerUser, type TestContext } from './helpers.js';

describe('Marketplace & bookings (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  const book = (token: string, serviceId: string, scheduledAt = hoursFromNow(48)) =>
    ctx.http.post('/api/v1/bookings').set(bearer(token)).send({ serviceId, scheduledAt, addressLine: '10 Beach Rd', city: 'Matara' });

  describe('search', () => {
    it('filters by category and city and paginates', async () => {
      const res = await ctx.http.get('/api/v1/services?category=plumbing&city=colombo&limit=2').expect(200);
      expect(res.body.meta).toMatchObject({ page: 1, limit: 2 });
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const s of res.body.data) {
        expect(s.category.slug).toBe('plumbing');
        expect(s.business.city).toBe('Colombo');
      }
    });

    it('sorts by price', async () => {
      const res = await ctx.http.get('/api/v1/services?sort=price_asc&limit=50').expect(200);
      const prices = res.body.data.map((s: { price: string }) => Number(s.price));
      expect(prices).toEqual([...prices].sort((a, b) => a - b));
    });

    it('free-text search matches titles and business names', async () => {
      const res = await ctx.http.get('/api/v1/services?q=perera').expect(200);
      expect(res.body.data.every((s: { business: { name: string } }) => s.business.name.includes('Perera'))).toBe(true);
    });

    it('rejects invalid query values', () => ctx.http.get('/api/v1/services?limit=500&sort=cheapest').expect(400));

    it('business profile shows working hours and star breakdown', async () => {
      const list = await ctx.http.get('/api/v1/businesses?category=plumbing').expect(200);
      const id = list.body.data[0].id;
      const detail = await ctx.http.get(`/api/v1/businesses/${id}`).expect(200);
      expect(detail.body.availability.length).toBe(6);
      const reviews = await ctx.http.get(`/api/v1/businesses/${id}/reviews`).expect(200);
      expect(Object.keys(reviews.body.stars)).toEqual(['1', '2', '3', '4', '5']);
    });
  });

  describe('booking lifecycle', () => {
    it('runs PENDING → ACCEPTED → IN_PROGRESS → COMPLETED and records everything', async () => {
      const { provider, business, service } = await createProviderWithService(ctx, { price: 6000 });
      const customer = await registerUser(ctx);

      const created = (await book(customer.accessToken, service.id).expect(201)).body;
      expect(created).toMatchObject({ status: 'PENDING', serviceTitle: 'Test repair', actions: ['cancel'] });
      expect(created.code).toMatch(/^FM-[A-Z2-9]{6}$/);
      expect(created.payment).toMatchObject({ status: 'PENDING', method: 'CASH' });

      const p = bearer(provider.accessToken);
      await ctx.http.post(`/api/v1/bookings/${created.id}/accept`).set(p).expect(200);
      await ctx.http.post(`/api/v1/bookings/${created.id}/start`).set(p).expect(200);
      const done = (await ctx.http.post(`/api/v1/bookings/${created.id}/complete`).set(p).expect(200)).body;
      expect(done.payment.status).toBe('PAID');
      expect(done.statusHistory.map((h: { toStatus: string }) => h.toStatus)).toEqual(['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED']);

      // Review → rating updates
      const c = bearer(customer.accessToken);
      await ctx.http.post(`/api/v1/bookings/${created.id}/review`).set(c).send({ rating: 4, comment: 'Good' }).expect(201);
      await ctx.http.post(`/api/v1/bookings/${created.id}/review`).set(c).send({ rating: 1 }).expect(409);
      const biz = (await ctx.http.get(`/api/v1/businesses/${business.id}`).expect(200)).body;
      expect(biz).toMatchObject({ ratingAvg: 4, ratingCount: 1, completedJobs: 1 });

      // Earnings
      const dash = (await ctx.http.get('/api/v1/provider/dashboard').set(p).expect(200)).body;
      expect(dash.earnings.thisMonth).toBe(6000);

      // Notifications reached the customer
      const notes = (await ctx.http.get('/api/v1/notifications').set(c).expect(200)).body;
      expect(notes.data.map((n: { type: string }) => n.type)).toEqual(
        expect.arrayContaining(['BOOKING_ACCEPTED', 'BOOKING_STARTED', 'BOOKING_COMPLETED']),
      );
    });

    it('enforces who can do what', async () => {
      const { provider, service } = await createProviderWithService(ctx);
      const customer = await registerUser(ctx);
      const stranger = await registerUser(ctx);
      const booking = (await book(customer.accessToken, service.id).expect(201)).body;

      await book(provider.accessToken, service.id).expect(403); // providers can't book
      await ctx.http.post(`/api/v1/bookings/${booking.id}/accept`).set(bearer(customer.accessToken)).expect(403);
      await ctx.http.get(`/api/v1/bookings/${booking.id}`).set(bearer(stranger.accessToken)).expect(404);
      await ctx.http.post(`/api/v1/bookings/${booking.id}/complete`).set(bearer(provider.accessToken)).expect(409); // can't skip steps
      await ctx.http.post(`/api/v1/bookings/${booking.id}/reject`).set(bearer(provider.accessToken)).send({}).expect(400); // reason needed
      await ctx.http.post(`/api/v1/bookings/${booking.id}/review`).set(bearer(customer.accessToken)).send({ rating: 5 }).expect(400); // not completed
    });

    it('validates time: lead time, working hours', async () => {
      const { provider, service } = await createProviderWithService(ctx);
      const customer = await registerUser(ctx);
      await book(customer.accessToken, service.id, hoursFromNow(0.25)).expect(400);

      // Open only Monday 09:00-12:00 Colombo time, then try a Sunday.
      await ctx.http
        .put('/api/v1/provider/business/availability')
        .set(bearer(provider.accessToken))
        .send({ slots: [{ dayOfWeek: 1, startMinute: 540, endMinute: 720 }] })
        .expect(200);
      const nextSunday = new Date();
      nextSunday.setUTCDate(nextSunday.getUTCDate() + ((7 - nextSunday.getUTCDay()) % 7 || 7));
      nextSunday.setUTCHours(5, 0, 0, 0);
      const res = await book(customer.accessToken, service.id, nextSunday.toISOString()).expect(400);
      expect(res.body.message).toMatch(/working hours/);
    });

    it('prevents double-booking the provider', async () => {
      const { provider, service } = await createProviderWithService(ctx, { durationMinutes: 120 });
      const a = await registerUser(ctx);
      const b = await registerUser(ctx);
      const first = (await book(a.accessToken, service.id, hoursFromNow(30)).expect(201)).body;
      const second = (await book(b.accessToken, service.id, hoursFromNow(31)).expect(201)).body; // overlaps (2h job)
      await ctx.http.post(`/api/v1/bookings/${first.id}/accept`).set(bearer(provider.accessToken)).expect(200);
      const clash = await ctx.http.post(`/api/v1/bookings/${second.id}/accept`).set(bearer(provider.accessToken)).expect(409);
      expect(clash.body.message).toContain(first.code);
    });

    it('blocks last-minute customer cancellation of an accepted job', async () => {
      const { provider, service } = await createProviderWithService(ctx);
      const customer = await registerUser(ctx);
      const booking = (await book(customer.accessToken, service.id, hoursFromNow(1.5)).expect(201)).body;
      await ctx.http.post(`/api/v1/bookings/${booking.id}/accept`).set(bearer(provider.accessToken)).expect(200);
      const res = await ctx.http
        .post(`/api/v1/bookings/${booking.id}/cancel`)
        .set(bearer(customer.accessToken))
        .send({ reason: 'Changed my mind' })
        .expect(400);
      expect(res.body.message).toMatch(/less than 2 hours/);
    });

    it('expires bookings the provider never answered', async () => {
      const { service } = await createProviderWithService(ctx);
      const customer = await registerUser(ctx);
      const booking = (await book(customer.accessToken, service.id).expect(201)).body;

      // Pretend it was created an hour ago, then run the sweeper.
      await ctx.prisma.booking.update({ where: { id: booking.id }, data: { createdAt: new Date(Date.now() - 3600_000) } });
      const { BookingsService } = await import('../src/bookings/bookings.service.js');
      const expired = await ctx.app.get(BookingsService).expireStale();
      expect(expired).toBeGreaterThanOrEqual(1);

      const after = (await ctx.http.get(`/api/v1/bookings/${booking.id}`).set(bearer(customer.accessToken)).expect(200)).body;
      expect(after.status).toBe('EXPIRED');
      expect(after.statusHistory.at(-1)).toMatchObject({ toStatus: 'EXPIRED', changedById: null });
    });

    it('lists only my own bookings, filtered by scope', async () => {
      const { service } = await createProviderWithService(ctx);
      const customer = await registerUser(ctx);
      await book(customer.accessToken, service.id).expect(201);
      const active = (await ctx.http.get('/api/v1/bookings?scope=active').set(bearer(customer.accessToken)).expect(200)).body;
      expect(active.meta.total).toBe(1);
      const history = (await ctx.http.get('/api/v1/bookings?scope=history').set(bearer(customer.accessToken)).expect(200)).body;
      expect(history.meta.total).toBe(0);
    });
  });
});
