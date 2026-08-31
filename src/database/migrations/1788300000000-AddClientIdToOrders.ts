import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClientIdToOrders1788300000000 implements MigrationInterface {
  name = 'AddClientIdToOrders1788300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('tb_orders');
    if (!table) return;

    const hasColumn = table.columns.some((c) => c.name === 'client_id');
    if (!hasColumn) {
      await queryRunner.query(`ALTER TABLE tb_orders ADD COLUMN client_id INT`);
      await queryRunner.query(
        `ALTER TABLE tb_orders ADD CONSTRAINT fk_orders_client_id FOREIGN KEY (client_id) REFERENCES tb_clients(id) ON DELETE SET NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('tb_orders');
    if (!table) return;

    await queryRunner.query(`ALTER TABLE tb_orders DROP CONSTRAINT IF EXISTS fk_orders_client_id`);
    await queryRunner.query(`ALTER TABLE tb_orders DROP COLUMN IF EXISTS client_id`);
  }
}
