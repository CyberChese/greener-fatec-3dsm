import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEnergyKwhToMetricCollection1792082025000
  implements MigrationInterface
{
  name = 'AddEnergyKwhToMetricCollection1792082025000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "metric_collections" ADD "energy_kwh" numeric(12,8)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "metric_collections" DROP COLUMN "energy_kwh"',
    );
  }
}
