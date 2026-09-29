import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

export interface TestContext {
  app: INestApplication;
  http: ReturnType<typeof request>;
  prisma: PrismaService;
  baseUrl: string;
}

/** Starts the real app on a random port (needed for Socket.IO tests). */
export async function createTestApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.listen(0);
  const address = app.getHttpServer().address() as { port: number };
  return {
    app,
    http: request(app.getHttpServer()),
    prisma: app.get(PrismaService),
    baseUrl: `http://localhost:${address.port}`,
  };
}

let counter = 0;
/** Unique email per call so tests never collide. */
export const uniqueEmail = (prefix: string) => `${prefix}.${Date.now().toString(36)}.${counter++}@test.lk`;

export async function registerUser(ctx: TestContext, role: 'CUSTOMER' | 'PROVIDER' = 'CUSTOMER') {
  const res = await ctx.http
    .post('/api/v1/auth/register')
    .send({ email: uniqueEmail(role.toLowerCase()), password: 'Password123', fullName: `Test ${role}`, role })
    .expect(201);
  return res.body as { user: { id: string; email: string; role: string }; accessToken: string; refreshToken: string };
}

export async function login(ctx: TestContext, email: string, password: string) {
  const res = await ctx.http.post('/api/v1/auth/login').send({ email, password }).expect(200);
  return res.body as { user: { id: string }; accessToken: string; refreshToken: string };
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

/** A provider with a business and one service, open any time (no working hours set). */
export async function createProviderWithService(ctx: TestContext, overrides: { price?: number; durationMinutes?: number } = {}) {
  const provider = await registerUser(ctx, 'PROVIDER');
  const categories = (await ctx.http.get('/api/v1/categories').expect(200)).body as { id: string; slug: string }[];
  const business = (
    await ctx.http.post('/api/v1/provider/business').set(bearer(provider.accessToken)).send({ name: `Biz ${uniqueEmail('b')}`, city: 'Matara' }).expect(201)
  ).body;
  const service = (
    await ctx.http
      .post('/api/v1/provider/services')
      .set(bearer(provider.accessToken))
      .send({
        title: 'Test repair',
        categoryId: categories.find((c) => c.slug === 'plumbing')!.id,
        priceType: 'FIXED',
        price: overrides.price ?? 5000,
        durationMinutes: overrides.durationMinutes ?? 60,
      })
      .expect(201)
  ).body;
  return { provider, business, service };
}

/** ISO time `hours` from now. */
export const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 3600_000).toISOString();
