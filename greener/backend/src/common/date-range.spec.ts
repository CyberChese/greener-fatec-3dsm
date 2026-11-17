import { BadRequestException } from '@nestjs/common';
import { parseDateParameter, parseDateRange } from './date-range';

describe('date-range', () => {
  it('aceita parâmetro ausente', () => {
    expect(parseDateParameter(undefined, 'from')).toBeUndefined();
  });

  it('converte datas válidas', () => {
    expect(parseDateRange('2026-11-01T00:00:00.000Z', '2026-11-02T00:00:00.000Z', 'from', 'to')).toEqual({
      from: new Date('2026-11-01T00:00:00.000Z'),
      to: new Date('2026-11-02T00:00:00.000Z'),
    });
  });

  it('rejeita data inválida citando o nome do parâmetro', () => {
    expect(() => parseDateParameter('ontem', 'startDate')).toThrow(
      new BadRequestException('Query parameter "startDate" must be a valid date.'),
    );
  });

  it('rejeita início depois do fim', () => {
    expect(() =>
      parseDateRange('2026-11-10T00:00:00.000Z', '2026-11-01T00:00:00.000Z', 'startDate', 'endDate'),
    ).toThrow(new BadRequestException('"startDate" must be earlier than or equal to "endDate".'));
  });
});
