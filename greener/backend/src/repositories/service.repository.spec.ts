import { Repository } from 'typeorm';
import { MetricCollection } from '../entities/metric-collection.entity';
import { Service, ServiceStatus } from '../entities/service.entity';
import { ServiceRepository } from './service.repository';

const chain = (methods: string[], terminal: Record<string, jest.Mock>) => {
  const builder: Record<string, jest.Mock> = { ...terminal };
  for (const method of methods) {
    builder[method] = jest.fn().mockReturnValue(builder);
  }
  return builder;
};

describe('ServiceRepository', () => {
  let typeorm: {
    find: jest.Mock;
    findOneBy: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
    upsert: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let repository: ServiceRepository;

  beforeEach(() => {
    typeorm = {
      find: jest.fn().mockResolvedValue([]),
      findOneBy: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(3),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      upsert: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(),
    };
    repository = new ServiceRepository(typeorm as unknown as Repository<Service>);
  });

  it('busca um serviço pelo id interno', async () => {
    await repository.findById('id-1');
    expect(typeorm.findOneBy).toHaveBeenCalledWith({ idServices: 'id-1' });
  });

  it('busca por external_id e, quando houver UUID, também pelo id interno', async () => {
    const uuid = '11111111-1111-4111-8111-111111111111';
    await repository.findByIdentifiers([uuid, 'billing-api']);

    const { where } = typeorm.find.mock.calls[0][0];
    expect(where).toHaveLength(2);
    expect(where[0].idServices._value).toEqual([uuid]);
    expect(where[1].external_id._value).toEqual([uuid, 'billing-api']);
  });

  it('não consulta id interno quando nenhum identificador é UUID', async () => {
    await repository.findByIdentifiers(['billing-api', 'auth-api']);
    expect(typeorm.find.mock.calls[0][0].where).toHaveLength(1);
  });

  it('conta serviços por estado e preenche estados ausentes com zero', async () => {
    const builder = chain(['select', 'addSelect', 'groupBy'], {
      getRawMany: jest.fn().mockResolvedValue([
        { status: ServiceStatus.ACTIVE, count: '4' },
        { status: ServiceStatus.UNAVAILABLE, count: 1 },
      ]),
    });
    typeorm.createQueryBuilder.mockReturnValue(builder);

    await expect(repository.countByStatus()).resolves.toEqual({
      [ServiceStatus.ACTIVE]: 4,
      [ServiceStatus.UNAVAILABLE]: 1,
      [ServiceStatus.NO_METRICS]: 0,
    });
  });

  it('atualiza o estado de um serviço', async () => {
    await repository.updateStatus('id-1', ServiceStatus.NO_METRICS);
    expect(typeorm.update).toHaveBeenCalledWith(
      { idServices: 'id-1' },
      { status: ServiceStatus.NO_METRICS },
    );
  });

  it('faz upsert por external_id e ignora lista vazia', async () => {
    await repository.upsertByExternalId([]);
    expect(typeorm.upsert).not.toHaveBeenCalled();

    const row = { external_id: 'billing-api' } as Service;
    await repository.upsertByExternalId([row]);
    expect(typeorm.upsert).toHaveBeenCalledWith([row], ['external_id']);
  });

  it('marca como indisponíveis os serviços fora da descoberta', async () => {
    const builder = chain(['update', 'set', 'where'], {
      execute: jest.fn().mockResolvedValue(undefined),
    });
    typeorm.createQueryBuilder.mockReturnValue(builder);

    await repository.markUnavailableExcept(['billing-api']);

    expect(builder.set).toHaveBeenCalledWith({ status: ServiceStatus.UNAVAILABLE });
    expect(builder.where).toHaveBeenCalledWith('"external_id" NOT IN (:...externalIds)', {
      externalIds: ['billing-api'],
    });
    expect(builder.execute).toHaveBeenCalled();
  });

  it('marca todos como indisponíveis quando a descoberta completa vem vazia', async () => {
    const builder = chain(['update', 'set', 'where'], {
      execute: jest.fn().mockResolvedValue(undefined),
    });
    typeorm.createQueryBuilder.mockReturnValue(builder);

    await repository.markUnavailableExcept([]);

    expect(builder.where).not.toHaveBeenCalled();
    expect(builder.execute).toHaveBeenCalled();
  });

  it.each([
    ['energy', 'collection.energy_kwh'],
    ['co2e', 'collection.co2e_kg'],
  ] as const)('monta o ranking por %s com período e paginação no banco', async (metric, column) => {
    const builder = chain(
      ['leftJoin', 'select', 'addSelect', 'groupBy', 'addGroupBy', 'orderBy', 'addOrderBy', 'offset', 'limit'],
      {
        getRawMany: jest.fn().mockResolvedValue([
          { service_id: 'id-1', external_id: 'billing', name: 'Billing', status: 'ACTIVE', metric_value: '1.25' },
        ]),
      },
    );
    typeorm.createQueryBuilder.mockReturnValue(builder);
    const from = new Date('2026-11-01T00:00:00.000Z');
    const to = new Date('2026-11-10T00:00:00.000Z');

    const rows = await repository.findImpactRanking({ metric, order: 'desc', page: 2, limit: 5, from, to });

    expect(builder.leftJoin).toHaveBeenCalledWith(
      MetricCollection,
      'collection',
      expect.stringContaining('collection.timestamp >= :startDate'),
      { startDate: from, endDate: to },
    );
    expect(builder.addSelect).toHaveBeenCalledWith(`COALESCE(SUM(${column}), 0)`, 'metric_value');
    expect(builder.orderBy).toHaveBeenCalledWith('metric_value', 'DESC');
    expect(builder.offset).toHaveBeenCalledWith(5);
    expect(builder.limit).toHaveBeenCalledWith(5);
    expect(rows[0].metric_value).toBe(1.25);
  });

  it('ordena o ranking em ordem crescente quando pedido', async () => {
    const builder = chain(
      ['leftJoin', 'select', 'addSelect', 'groupBy', 'addGroupBy', 'orderBy', 'addOrderBy', 'offset', 'limit'],
      { getRawMany: jest.fn().mockResolvedValue([]) },
    );
    typeorm.createQueryBuilder.mockReturnValue(builder);

    await repository.findImpactRanking({ metric: 'co2e', order: 'asc', page: 1, limit: 10 });

    expect(builder.orderBy).toHaveBeenCalledWith('metric_value', 'ASC');
    expect(builder.leftJoin).toHaveBeenCalledWith(
      MetricCollection,
      'collection',
      'collection.service_id = service.idServices',
      {},
    );
  });
});
