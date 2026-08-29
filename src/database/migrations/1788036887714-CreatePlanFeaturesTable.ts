import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreatePlanFeaturesTable1785011998479 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'tb_plan_features',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'plan_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'text',
            type: 'varchar',
            length: '255',
            isNullable: false,
            comment:
              'Texto exibido na página de preços. Não usar para lógica de bloqueio.',
          },
          {
            name: 'is_included',
            type: 'boolean',
            isNullable: false,
            default: true,
          },
          {
            name: 'position',
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
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            name: 'fk_plan_features_plan',
            columnNames: ['plan_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'tb_plans',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
        ],
        uniques: [
          {
            name: 'uq_plan_features_plan_text',
            columnNames: ['plan_id', 'text'],
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('tb_plan_features');
  }
}
