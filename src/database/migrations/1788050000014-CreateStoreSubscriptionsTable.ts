import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateStoreSubscriptionsTable1788050000014 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'tb_store_subscriptions',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'store_id', type: 'integer', isNullable: false },
          { name: 'plan_id', type: 'integer', isNullable: false },
          {
            name: 'start_date',
            type: 'timestamp',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
          { name: 'end_date', type: 'timestamp', isNullable: true },
          {
            name: 'status',
            type: 'varchar',
            length: '30',
            isNullable: false,
            default: "'active'",
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
            name: 'fk_subscriptions_store',
            columnNames: ['store_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'tb_stores',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          {
            name: 'fk_subscriptions_plan',
            columnNames: ['plan_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'tb_plans',
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('tb_store_subscriptions');
  }
}
