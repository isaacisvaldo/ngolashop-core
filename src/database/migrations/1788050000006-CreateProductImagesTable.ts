import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateProductImagesTable1788050000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'tb_product_images',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'product_id', type: 'integer', isNullable: false },
          { name: 'url', type: 'varchar', length: '255', isNullable: false },
          {
            name: 'alt_text',
            type: 'varchar',
            length: '255',
            isNullable: true,
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
        foreignKeys: [
          {
            name: 'fk_product_images_product',
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
    await queryRunner.dropTable('tb_product_images');
  }
}
