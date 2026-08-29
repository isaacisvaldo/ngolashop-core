import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateOrderStatusHistoryTable1788050000009 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'tb_order_status_history',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'order_id', type: 'integer', isNullable: false },
          { name: 'status', type: 'varchar', length: '30', isNullable: false },
          { name: 'note', type: 'text', isNullable: true },
          { name: 'changed_by', type: 'integer', isNullable: true },
          {
            name: 'created_at',
            type: 'timestamp',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            name: 'fk_order_status_history_order',
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
    await queryRunner.dropTable('tb_order_status_history');
  }
}
