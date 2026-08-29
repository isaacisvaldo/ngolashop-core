import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateRolePermissionsTable1785011893341 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'tb_role_permissions',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'role_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'permission_id',
            type: 'integer',
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
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            name: 'fk_role_permissions_role',
            columnNames: ['role_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'tb_roles',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          {
            name: 'fk_role_permissions_permission',
            columnNames: ['permission_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'tb_permissions',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('tb_role_permissions');
  }
}
