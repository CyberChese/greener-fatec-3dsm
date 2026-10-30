import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCarbonIntensityData1793308800000 implements MigrationInterface {
  name = 'AddCarbonIntensityData1793308800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "services" ADD "region_code" character varying(100)',
    );
    await queryRunner.query(
      'ALTER TABLE "metric_collections" ADD "carbon_intensity_gco2e_per_kwh" numeric(20,8)',
    );
    await queryRunner.query(
      'ALTER TABLE "metric_collections" ADD "co2e_g" numeric(20,8)',
    );
    await queryRunner.query(
      'ALTER TABLE "metric_collections" ADD "carbon_intensity_fallback" boolean',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "metric_collections" DROP COLUMN "carbon_intensity_fallback"',
    );
    await queryRunner.query(
      'ALTER TABLE "metric_collections" DROP COLUMN "co2e_g"',
    );
    await queryRunner.query(
      'ALTER TABLE "metric_collections" DROP COLUMN "carbon_intensity_gco2e_per_kwh"',
    );
    await queryRunner.query('ALTER TABLE "services" DROP COLUMN "region_code"');
  }
}
