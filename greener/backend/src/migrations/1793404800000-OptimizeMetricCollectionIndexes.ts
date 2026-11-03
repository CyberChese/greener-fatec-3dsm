import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizeMetricCollectionIndexes1793404800000
  implements MigrationInterface
{
  name = 'OptimizeMetricCollectionIndexes1793404800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "idx_metric_collections_timestamp_totals" ON "metric_collections" ("timestamp") INCLUDE ("energy_kwh", "co2e_g")`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_metric_collections_timestamp"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_metric_collections_service_id"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "idx_metric_collections_service_id" ON "metric_collections" ("service_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_metric_collections_timestamp" ON "metric_collections" ("timestamp")`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_metric_collections_timestamp_totals"`,
    );
  }
}
