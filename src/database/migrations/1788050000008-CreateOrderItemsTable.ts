import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateOrderItemsTable1788050000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'tb_order_items',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'order_id', type: 'integer', isNullable: false },
          { name: 'product_id', type: 'integer', isNullable: false },
          {
            name: 'product_name',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'product_price',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          { name: 'quantity', type: 'integer', isNullable: false, default: 1 },
          {
            name: 'subtotal',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: false,
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
        ],
        foreignKeys: [
          {
            name: 'fk_order_items_order',
            columnNames: ['order_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'tb_orders',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          {
            name: 'fk_order_items_product',
            columnNames: ['product_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'tb_products',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('tb_order_items');
  }
}
