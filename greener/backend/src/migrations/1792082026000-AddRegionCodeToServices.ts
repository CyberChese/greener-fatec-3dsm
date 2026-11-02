import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRegionCodeToServices1792082026000
  implements MigrationInterface
{
  name = 'AddRegionCodeToServices1792082026000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "region_code" character varying(100)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "services" DROP COLUMN IF EXISTS "region_code"',
    );
  }
}

