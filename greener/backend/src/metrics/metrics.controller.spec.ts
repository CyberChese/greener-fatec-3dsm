import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { AnalyticsService } from './analytics.service';

describe('MetricsController', () => {
  let app: INestApplication;

  const summary = {
    total_energy_kwh: 12.5,
    total_co2e_kg: 3.2,
    services_count: {
      active: 4,
      unavailable: 1,
      no_metrics: 2,
    },
  };
  const getRanking = jest.fn((query: object) => Promise.resolve(query));

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        {
          provide: MetricsService,
          useValue: {
            getSummary: jest.fn().mockResolvedValue(summary),
          },
        },
        {
          provide: AnalyticsService,
          useValue: { getRanking },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns the summary with HTTP 200 without a token', async () => {
    await request(app.getHttpServer())
      .get('/api/metrics/summary')
      .expect(200)
      .expect(summary);
  });

  it('serves a paginated ranking endpoint', async () => {
    await request(app.getHttpServer())
      .get('/api/metrics/ranking?metric=co2e&order=desc&page=2&limit=5')
      .expect(200)
      .expect({ metric: 'co2e', order: 'desc', page: 2, limit: 5 });
  });

  it('rejects invalid dates and unsupported ranking metrics', async () => {
    await request(app.getHttpServer())
      .get('/api/metrics/ranking?startDate=not-a-date')
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/metrics/ranking?metric=unknown')
      .expect(400);
  });
});
