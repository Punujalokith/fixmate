// Health, categories, auth and profile — the basics every other feature relies on.
import { bearer, createTestApp, login, registerUser, uniqueEmail, type TestContext } from './helpers.js';

describe('Core API (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  describe('health & categories', () => {
    it('GET /health reports database up', async () => {
      const res = await ctx.http.get('/api/v1/health').expect(200);
      expect(res.body).toMatchObject({ status: 'ok', database: 'up' });
    });

    it('GET /categories returns the seeded categories in order', async () => {
      const res = await ctx.http.get('/api/v1/categories').expect(200);
      expect(res.body.map((c: { slug: string }) => c.slug).slice(0, 3)).toEqual(['plumbing', 'electrical', 'ac-repair']);
    });

    it('GET /categories/:slug returns 404 for unknown slug', () =>
      ctx.http.get('/api/v1/categories/does-not-exist').expect(404));
  });

  describe('auth', () => {
    it('registers, logs in and returns the profile', async () => {
      const email = uniqueEmail('auth');
      const reg = await ctx.http
        .post('/api/v1/auth/register')
        .send({ email: email.toUpperCase(), password: 'Password123', fullName: '  Nimal Perera ' })
        .expect(201);
      expect(reg.body.user).toMatchObject({ email, fullName: 'Nimal Perera', role: 'CUSTOMER' });
      expect(reg.body.user.passwordHash).toBeUndefined();

      const { accessToken } = await login(ctx, email, 'Password123');
      const me = await ctx.http.get('/api/v1/auth/me').set(bearer(accessToken)).expect(200);
      expect(me.body.email).toBe(email);
    });

    it('rejects weak passwords, duplicate emails and unknown fields', async () => {
      await ctx.http.post('/api/v1/auth/register').send({ email: uniqueEmail('w'), password: 'short', fullName: 'Weak' }).expect(400);
      const user = await registerUser(ctx);
      await ctx.http.post('/api/v1/auth/register').send({ email: user.user.email, password: 'Password123', fullName: 'Dup' }).expect(409);
      await ctx.http
        .post('/api/v1/auth/register')
        .send({ email: uniqueEmail('x'), password: 'Password123', fullName: 'Sneaky', role: 'ADMIN' })
        .expect(400);
    });

    it('uses the same error for wrong password and unknown email', async () => {
      const user = await registerUser(ctx);
      const wrong = await ctx.http.post('/api/v1/auth/login').send({ email: user.user.email, password: 'Wrong1234' }).expect(401);
      const unknown = await ctx.http.post('/api/v1/auth/login').send({ email: uniqueEmail('nobody'), password: 'Wrong1234' }).expect(401);
      expect(wrong.body.message).toBe(unknown.body.message);
    });

    it('protects routes and rejects bad tokens', async () => {
      await ctx.http.get('/api/v1/auth/me').expect(401);
      await ctx.http.get('/api/v1/auth/me').set(bearer('not.a.jwt')).expect(401);
    });

    it('rotates refresh tokens and detects reuse', async () => {
      const user = await registerUser(ctx);
      const first = await ctx.http.post('/api/v1/auth/refresh').send({ refreshToken: user.refreshToken }).expect(200);
      expect(first.body.refreshToken).not.toBe(user.refreshToken);

      // Re-using the old token = probably stolen → everything is revoked.
      await ctx.http.post('/api/v1/auth/refresh').send({ refreshToken: user.refreshToken }).expect(401);
      await ctx.http.post('/api/v1/auth/refresh').send({ refreshToken: first.body.refreshToken }).expect(401);
    });

    it('logout revokes the refresh token', async () => {
      const user = await registerUser(ctx);
      await ctx.http.post('/api/v1/auth/logout').send({ refreshToken: user.refreshToken }).expect(204);
      await ctx.http.post('/api/v1/auth/refresh').send({ refreshToken: user.refreshToken }).expect(401);
    });

    it('blocks customers from provider and admin routes', async () => {
      const user = await registerUser(ctx);
      await ctx.http.get('/api/v1/provider/dashboard').set(bearer(user.accessToken)).expect(403);
      await ctx.http.get('/api/v1/admin/stats').set(bearer(user.accessToken)).expect(403);
    });
  });

  describe('profile', () => {
    it('updates profile and changes password (old sessions end)', async () => {
      const user = await registerUser(ctx);
      const auth = bearer(user.accessToken);
      const updated = await ctx.http.patch('/api/v1/me').set(auth).send({ fullName: 'New Name', phone: '+94770001234' }).expect(200);
      expect(updated.body.fullName).toBe('New Name');

      await ctx.http.post('/api/v1/me/password').set(auth).send({ currentPassword: 'wrong', newPassword: 'NewPass123' }).expect(400);
      await ctx.http.post('/api/v1/me/password').set(auth).send({ currentPassword: 'Password123', newPassword: 'NewPass123' }).expect(204);
      await ctx.http.post('/api/v1/auth/refresh').send({ refreshToken: user.refreshToken }).expect(401);
      await login(ctx, user.user.email, 'NewPass123');
    });

    it('manages addresses with a single default', async () => {
      const user = await registerUser(ctx);
      const auth = bearer(user.accessToken);
      const home = (await ctx.http.post('/api/v1/me/addresses').set(auth).send({ label: 'Home', line1: '1 Main St', city: 'Galle' }).expect(201)).body;
      expect(home.isDefault).toBe(true);
      const work = (
        await ctx.http.post('/api/v1/me/addresses').set(auth).send({ label: 'Work', line1: '2 Office Rd', city: 'Galle', isDefault: true }).expect(201)
      ).body;
      const list = (await ctx.http.get('/api/v1/me/addresses').set(auth).expect(200)).body;
      expect(list.filter((a: { isDefault: boolean }) => a.isDefault).map((a: { id: string }) => a.id)).toEqual([work.id]);

      // Deleting the default promotes the other one.
      await ctx.http.delete(`/api/v1/me/addresses/${work.id}`).set(auth).expect(204);
      const after = (await ctx.http.get('/api/v1/me/addresses').set(auth).expect(200)).body;
      expect(after[0]).toMatchObject({ id: home.id, isDefault: true });
    });
  });
});
