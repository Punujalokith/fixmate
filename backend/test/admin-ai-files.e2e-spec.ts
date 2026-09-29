// Admin tools, the AI assistant (offline fallback in tests) and file uploads.
import { bearer, createTestApp, login, registerUser, type TestContext } from './helpers.js';

const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

describe('Admin, AI and files (e2e)', () => {
  let ctx: TestContext;
  let adminToken: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    adminToken = (await login(ctx, 'admin@fixmate.lk', 'Admin@12345')).accessToken;
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  describe('AI assistant', () => {
    it('classifies a problem and suggests providers', async () => {
      const customer = await registerUser(ctx);
      const res = await ctx.http
        .post('/api/v1/ai/assist')
        .set(bearer(customer.accessToken))
        .send({ message: 'My kitchen sink is leaking badly', city: 'Colombo' })
        .expect(200);
      expect(res.body).toMatchObject({ source: 'fallback', category: { slug: 'plumbing' } });
      expect(res.body.providers.length).toBeGreaterThan(0);
      expect(res.body.followUpQuestions.length).toBeLessThanOrEqual(3);
    });

    it('gives safety advice for emergencies', async () => {
      const customer = await registerUser(ctx);
      const res = await ctx.http
        .post('/api/v1/ai/assist')
        .set(bearer(customer.accessToken))
        .send({ message: 'There are sparks coming from the wall socket' })
        .expect(200);
      expect(res.body.urgency).toBe('emergency');
      expect(res.body.safetyAdvice).toBeTruthy();
    });

    it('requires login', () => ctx.http.post('/api/v1/ai/assist').send({ message: 'leak' }).expect(401));
  });

  describe('admin', () => {
    it('returns platform stats', async () => {
      const res = await ctx.http.get('/api/v1/admin/stats').set(bearer(adminToken)).expect(200);
      expect(res.body.users.PROVIDER).toBeGreaterThanOrEqual(8);
      expect(res.body.bookings.daily).toHaveLength(14);
      expect(res.body.revenue.allTime).toBeGreaterThan(0);
    });

    it('suspends a user: they are logged out and cannot log in', async () => {
      const user = await registerUser(ctx);
      await ctx.http
        .patch(`/api/v1/admin/users/${user.user.id}/status`)
        .set(bearer(adminToken))
        .send({ status: 'SUSPENDED', reason: 'Spam' })
        .expect(200);
      await ctx.http.post('/api/v1/auth/refresh').send({ refreshToken: user.refreshToken }).expect(401);
      await ctx.http.post('/api/v1/auth/login').send({ email: user.user.email, password: 'Password123' }).expect(403);

      const logs = await ctx.http.get('/api/v1/admin/audit-logs?action=user.suspend').set(bearer(adminToken)).expect(200);
      expect(logs.body.data[0]).toMatchObject({ entityId: user.user.id, metadata: { reason: 'Spam' } });
    });

    it('hiding a review recalculates the business rating', async () => {
      const reviews = (await ctx.http.get('/api/v1/admin/reviews').set(bearer(adminToken)).expect(200)).body.data;
      const review = reviews[0];
      await ctx.http.patch(`/api/v1/admin/reviews/${review.id}`).set(bearer(adminToken)).send({ isHidden: true }).expect(200);
      const business = (await ctx.http.get(`/api/v1/businesses/${review.business.id}`).expect(200)).body;
      const visible = await ctx.prisma.review.count({ where: { businessId: review.business.id, isHidden: false } });
      expect(business.ratingCount).toBe(visible);
      await ctx.http.patch(`/api/v1/admin/reviews/${review.id}`).set(bearer(adminToken)).send({ isHidden: false }).expect(200);
    });

    it('verifies a business and notifies the owner', async () => {
      const list = (await ctx.http.get('/api/v1/admin/businesses?verified=false').set(bearer(adminToken)).expect(200)).body.data;
      const business = list[0];
      await ctx.http.patch(`/api/v1/admin/businesses/${business.id}`).set(bearer(adminToken)).send({ isVerified: true }).expect(200);
      const note = await ctx.prisma.notification.findFirst({ where: { userId: business.owner.id, type: 'SYSTEM' } });
      expect(note?.title).toMatch(/verified/);
    });

    it('logs AI usage', async () => {
      const res = await ctx.http.get('/api/v1/admin/ai-usage').set(bearer(adminToken)).expect(200);
      expect(res.body).toHaveProperty('requests30d');
    });

    it('admins cannot suspend themselves', async () => {
      const me = (await ctx.http.get('/api/v1/auth/me').set(bearer(adminToken)).expect(200)).body;
      await ctx.http.patch(`/api/v1/admin/users/${me.id}/status`).set(bearer(adminToken)).send({ status: 'SUSPENDED' }).expect(400);
    });
  });

  describe('file uploads', () => {
    it('accepts a real image and serves it', async () => {
      const user = await registerUser(ctx);
      const res = await ctx.http
        .post('/api/v1/files')
        .set(bearer(user.accessToken))
        .field('purpose', 'AVATAR')
        .attach('file', PNG_1PX, { filename: 'me.png', contentType: 'image/png' })
        .expect(201);
      expect(res.body).toMatchObject({ mimeType: 'image/png', purpose: 'AVATAR' });
      const path = new URL(res.body.url).pathname;
      await ctx.http.get(path).expect(200).expect('content-type', /image\/png/);
      await ctx.http.get('/uploads/..%2F..%2F.env').expect((r) => expect([400, 403, 404]).toContain(r.status));
    });

    it('rejects files that only pretend to be images', async () => {
      const user = await registerUser(ctx);
      await ctx.http
        .post('/api/v1/files')
        .set(bearer(user.accessToken))
        .field('purpose', 'AVATAR')
        .attach('file', Buffer.from('<script>alert(1)</script>'), { filename: 'evil.png', contentType: 'image/png' })
        .expect(400);
    });

    it('customers cannot upload business images', async () => {
      const user = await registerUser(ctx);
      await ctx.http
        .post('/api/v1/files')
        .set(bearer(user.accessToken))
        .field('purpose', 'BUSINESS_LOGO')
        .attach('file', PNG_1PX, { filename: 'logo.png', contentType: 'image/png' })
        .expect(400);
    });
  });
});
