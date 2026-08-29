import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreatePaymentMethodsTable1788050000015 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'tb_payment_methods',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'name', type: 'varchar', length: '100', isNullable: false },
          {
            name: 'slug',
            type: 'varchar',
            length: '120',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'icon_url',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          { name: 'description', type: 'text', isNullable: true },
          {
            name: 'is_active',
            type: 'boolean',
            isNullable: false,
            default: true,
          },
          { name: 'position', type: 'integer', isNullable: false, default: 0 },
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
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('tb_payment_methods');
  }
}
