import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

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
      ],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api');
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
});
