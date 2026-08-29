import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateProductsTable1788050000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'tb_products',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'store_id', type: 'integer', isNullable: false },
          { name: 'category_id', type: 'integer', isNullable: true },
          { name: 'name', type: 'varchar', length: '200', isNullable: false },
          { name: 'slug', type: 'varchar', length: '220', isNullable: false },
          { name: 'description', type: 'text', isNullable: true },
          {
            name: 'price',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: 'compare_at_price',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'stock_quantity',
            type: 'integer',
            isNullable: false,
            default: 0,
          },
          { name: 'sku', type: 'varchar', length: '100', isNullable: true },
          {
            name: 'is_active',
            type: 'boolean',
            isNullable: false,
            default: true,
          },
          {
            name: 'is_featured',
            type: 'boolean',
            isNullable: false,
            default: false,
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
            name: 'total_sales',
            type: 'integer',
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
          { name: 'deleted_at', type: 'timestamp', isNullable: true },
        ],
        foreignKeys: [
          {
            name: 'fk_products_store',
            columnNames: ['store_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'tb_stores',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          {
            name: 'fk_products_category',
            columnNames: ['category_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'tb_categories',
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE',
          },
        ],
        uniques: [
          { name: 'uq_products_store_slug', columnNames: ['store_id', 'slug'] },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('tb_products');
  }
}
