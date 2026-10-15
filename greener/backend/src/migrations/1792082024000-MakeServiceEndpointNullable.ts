import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeServiceEndpointNullable1792082024000
  implements MigrationInterface
{
  name = 'MakeServiceEndpointNullable1792082024000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "services" ALTER COLUMN "endpoint" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "services" ALTER COLUMN "endpoint" SET NOT NULL`,
    );
  }
}