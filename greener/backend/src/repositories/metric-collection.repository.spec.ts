import { Repository } from 'typeorm';
import { MetricCollection } from '../entities/metric-collection.entity';
import { MetricCollectionRepository } from './metric-collection.repository';

describe('MetricCollectionRepository', () => {
  let typeorm: {
    find: jest.Mock;
    findOneBy: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let repository: MetricCollectionRepository;

  beforeEach(() => {
    typeorm = {
      find: jest.fn().mockResolvedValue([]),
      findOneBy: jest.fn().mockResolvedValue(null),
      create: jest.fn((value: object) => value),
      save: jest.fn((value: object) => Promise.resolve(value)),
      createQueryBuilder: jest.fn(),
    };
    repository = new MetricCollectionRepository(
      typeorm as unknown as Repository<MetricCollection>,
    );
  });

  it('cria e salva uma coleta', async () => {
    await repository.createAndSave({ service_id: 'id-1' });
    expect(typeorm.create).toHaveBeenCalledWith({ service_id: 'id-1' });
    expect(typeorm.save).toHaveBeenCalledWith({ service_id: 'id-1' });
  });

  it('devolve o horário da coleta mais recente ou null', async () => {
    await expect(repository.findLatestTimestamp()).resolves.toBeNull();

    const timestamp = new Date('2026-11-17T12:00:00.000Z');
    typeorm.find.mockResolvedValue([{ timestamp }]);
    await expect(repository.findLatestTimestamp()).resolves.toBe(timestamp);
    expect(typeorm.find).toHaveBeenCalledWith({
      select: { timestamp: true },
      order: { timestamp: 'DESC' },
      take: 1,
    });
  });

  it('soma energia e CO2e de todas as coletas', async () => {
    const builder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({
        total_energy_kwh: '12.50000000',
        total_co2e_kg: '3.20000000000',
      }),
    };
    typeorm.createQueryBuilder.mockReturnValue(builder);

    await expect(repository.sumImpact()).resolves.toEqual({ energyKwh: 12.5, co2eKg: 3.2 });
  });

  it('soma zero quando o banco não devolve totais', async () => {
    typeorm.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue(undefined),
    });

    await expect(repository.sumImpact()).resolves.toEqual({ energyKwh: 0, co2eKg: 0 });
  });

  it.each([
    ['as duas datas', { from: new Date('2026-10-01'), to: new Date('2026-10-02') }, 'between'],
    ['só a data inicial', { from: new Date('2026-10-01') }, 'moreThanOrEqual'],
    ['só a data final', { to: new Date('2026-10-02') }, 'lessThanOrEqual'],
  ])('filtra o histórico de um serviço com %s', async (_, range, type) => {
    await repository.findByService('id-1', range);

    expect(typeorm.find).toHaveBeenCalledWith({
      where: { service_id: 'id-1', timestamp: expect.objectContaining({ _type: type }) },
      order: { timestamp: 'ASC' },
    });
  });

  it('não filtra por data quando o período não é informado', async () => {
    await repository.findByService('id-1', {});

    expect(typeorm.find).toHaveBeenCalledWith({
      where: { service_id: 'id-1' },
      order: { timestamp: 'ASC' },
    });
  });

  it('busca as coletas de vários serviços em ordem cronológica', async () => {
    await repository.findByServices(['id-1', 'id-2'], { from: new Date('2026-10-01') });

    const { where, order } = typeorm.find.mock.calls[0][0];
    expect(where.service_id).toEqual(expect.objectContaining({ _type: 'in', _value: ['id-1', 'id-2'] }));
    expect(where.timestamp).toEqual(expect.objectContaining({ _type: 'moreThanOrEqual' }));
    expect(order).toEqual({ timestamp: 'ASC' });
  });
});
