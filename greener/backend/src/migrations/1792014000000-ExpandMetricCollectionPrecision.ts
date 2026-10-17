import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandMetricCollectionPrecision1792014000000
  implements MigrationInterface
{
  name = 'ExpandMetricCollectionPrecision1792014000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "metric_collections"
       ALTER COLUMN "cpu_usage" TYPE numeric(20,6) USING "cpu_usage"::numeric(20,6),
       ALTER COLUMN "memory_usage" TYPE numeric(20,6) USING "memory_usage"::numeric(20,6),
       ALTER COLUMN "storage_usage" TYPE numeric(20,6) USING "storage_usage"::numeric(20,6),
       ALTER COLUMN "network_io" TYPE numeric(20,6) USING "network_io"::numeric(20,6)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "metric_collections"
       ALTER COLUMN "cpu_usage" TYPE numeric(5,2) USING "cpu_usage"::numeric(5,2),
       ALTER COLUMN "memory_usage" TYPE numeric(5,2) USING "memory_usage"::numeric(5,2),
       ALTER COLUMN "storage_usage" TYPE bigint USING round("storage_usage")::bigint,
       ALTER COLUMN "network_io" TYPE bigint USING round("network_io")::bigint`,
    );
  }
}
