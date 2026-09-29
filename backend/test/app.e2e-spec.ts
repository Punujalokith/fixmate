// End-to-end tests: start the real app and call it over HTTP.
// Needs the Docker databases running and the seed applied.
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';

describe('FixMate API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((res) => expect(res.body).toMatchObject({ status: 'ok', database: 'up' }));
  });

  it('GET /api/v1/categories returns seeded categories', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/categories').expect(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('slug');
  });

  it('GET /api/v1/categories/:slug returns 404 for unknown slug', () => {
    return request(app.getHttpServer()).get('/api/v1/categories/does-not-exist').expect(404);
  });
});
