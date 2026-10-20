import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInitialSchema1791678624275 implements MigrationInterface {
    name = 'CreateInitialSchema1791678624275'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users" ("idUsers" uuid NOT NULL DEFAULT uuid_generate_v4(), "nameUsers" character varying(100) NOT NULL, "email" character varying(255) NOT NULL, "password_hash" character varying(255) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a36122b97a8adf4b59571b9726f" PRIMARY KEY ("idUsers"))`);
        await queryRunner.query(`CREATE TYPE "public"."service_status" AS ENUM('ACTIVE', 'UNAVAILABLE', 'NO_METRICS')`);
        await queryRunner.query(`CREATE TABLE "services" ("idServices" uuid NOT NULL DEFAULT uuid_generate_v4(), "external_id" character varying(255) NOT NULL, "nameServices" character varying(100) NOT NULL, "endpoint" character varying(255) NOT NULL, "status" "public"."service_status" NOT NULL DEFAULT 'NO_METRICS', "country" character varying(100), "region" character varying(100), "city" character varying(100), "latitude" numeric(9,6), "longitude" numeric(9,6), "create_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "last_observed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_aafb72a670daaf1709065b8f78f" UNIQUE ("external_id"), CONSTRAINT "PK_a37c5c335457ff4bf77cf596439" PRIMARY KEY ("idServices"))`);
        await queryRunner.query(`CREATE TABLE "metric_collections" ("idCollections" uuid NOT NULL DEFAULT uuid_generate_v4(), "service_id" uuid NOT NULL, "cpu_usage" numeric(5,2), "memory_usage" numeric(5,2), "storage_usage" bigint, "network_io" bigint, "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_7a8ed154f05c17e581ca31a5bf9" PRIMARY KEY ("idCollections"))`);
        await queryRunner.query(`CREATE INDEX "idx_metric_collections_service_timestamp" ON "metric_collections" ("service_id", "timestamp") `);
        await queryRunner.query(`CREATE INDEX "idx_metric_collections_service_id" ON "metric_collections" ("service_id") `);
        await queryRunner.query(`CREATE INDEX "idx_metric_collections_timestamp" ON "metric_collections" ("timestamp") `);
        await queryRunner.query(`ALTER TABLE "metric_collections" ADD CONSTRAINT "fk_metric_collections_service" FOREIGN KEY ("service_id") REFERENCES "services"("idServices") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "metric_collections" DROP CONSTRAINT "fk_metric_collections_service"`);
        await queryRunner.query(`DROP INDEX "public"."idx_metric_collections_timestamp"`);
        await queryRunner.query(`DROP INDEX "public"."idx_metric_collections_service_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_metric_collections_service_timestamp"`);
        await queryRunner.query(`DROP TABLE "metric_collections"`);
        await queryRunner.query(`DROP TABLE "services"`);
        await queryRunner.query(`DROP TYPE "public"."service_status"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
