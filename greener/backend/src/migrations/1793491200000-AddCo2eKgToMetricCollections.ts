import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCo2eKgToMetricCollections1793491200000
  implements MigrationInterface
{
  name = 'AddCo2eKgToMetricCollections1793491200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "metric_collections" ADD "co2e_kg" numeric(20,11)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "metric_collections" DROP COLUMN "co2e_kg"',
    );
  }
}
