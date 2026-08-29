import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateStoresTable1785011998474 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'tb_stores',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'user_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '150',
            isNullable: false,
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '180',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'logo_url',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'banner_url',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'whatsapp',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'primary_color',
            type: 'varchar',
            length: '10',
            isNullable: true,
          },
          {
            name: 'is_verified',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            isNullable: false,
            default: true,
          },
          {
            name: 'has_logistics',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          {
            name: 'commission_percentage',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'average_rating',
            type: 'decimal',
            precision: 3,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('tb_stores');
  }
}
