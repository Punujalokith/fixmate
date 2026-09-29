import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma/prisma.service.js';

describe('AppController', () => {
  let appController: AppController;
  const prismaMock = { $queryRaw: vi.fn() };

  beforeEach(async () => {
    prismaMock.$queryRaw.mockReset();
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('reports ok when the database responds', async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    await expect(appController.checkHealth()).resolves.toMatchObject({
      status: 'ok',
      database: 'up',
    });
  });

  it('throws 503 when the database is down', async () => {
    prismaMock.$queryRaw.mockRejectedValue(new Error('connection refused'));
    await expect(appController.checkHealth()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
