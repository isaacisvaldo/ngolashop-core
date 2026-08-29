import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreatePaymentsTable1788050000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'tb_payments',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'order_id', type: 'integer', isNullable: false },
          { name: 'method', type: 'varchar', length: '50', isNullable: false },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
            isNullable: false,
            default: "'pending'",
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'reference',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          { name: 'paid_at', type: 'timestamp', isNullable: true },
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
        ],
        foreignKeys: [
          {
            name: 'fk_payments_order',
            columnNames: ['order_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'tb_orders',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('tb_payments');
  }
}
