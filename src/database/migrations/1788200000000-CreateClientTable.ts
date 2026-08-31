import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClientTable1788200000000 implements MigrationInterface {
  name = 'CreateClientTable1788200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tb_clients" (
        "id" SERIAL NOT NULL,
        "name" varchar(150) NOT NULL,
        "email" varchar(150) NOT NULL,
        "password" varchar(255) NOT NULL,
        "phone" varchar(20) NOT NULL,
        "avatar_url" varchar(255),
        "province" varchar(100),
        "city" varchar(100),
        "address" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "refresh_token" varchar(512),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "UQ_tb_clients_email" UNIQUE ("email"),
        CONSTRAINT "UQ_tb_clients_phone" UNIQUE ("phone"),
        CONSTRAINT "PK_tb_clients" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tb_clients"`);
  }
}
