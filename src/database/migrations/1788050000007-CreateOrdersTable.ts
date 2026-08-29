import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateOrdersTable1788050000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'tb_orders',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'store_id', type: 'integer', isNullable: false },
          {
            name: 'customer_name',
            type: 'varchar',
            length: '150',
            isNullable: false,
          },
          {
            name: 'customer_email',
            type: 'varchar',
            length: '150',
            isNullable: true,
          },
          {
            name: 'customer_phone',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          { name: 'shipping_address', type: 'text', isNullable: true },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
            isNullable: false,
            default: "'pending'",
          },
          {
            name: 'subtotal',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: 'shipping_cost',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: 'total',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          { name: 'notes', type: 'text', isNullable: true },
          {
            name: 'tracking_code',
            type: 'varchar',
            length: '100',
            isNullable: true,
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
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
        ],
        foreignKeys: [
          {
            name: 'fk_orders_store',
            columnNames: ['store_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'tb_stores',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('tb_orders');
  }
}
