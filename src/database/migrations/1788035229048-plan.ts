import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreatePlansTable1785011998478 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'tb_plans',
        columns: [
          {
            name: 'id',
            type: 'serial',
            isPrimary: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'is_active',
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

          // --- LIMITES REAIS DO PLANO (usados para bloquear a loja) ---
          // Regra: null = ilimitado. Qualquer número = limite rígido a validar no backend.
          {
            name: 'limit_products',
            type: 'integer',
            isNullable: true,
            comment:
              'Máximo de produtos ativos que a loja pode ter. null = ilimitado.',
          },
          {
            name: 'limit_images_per_product',
            type: 'integer',
            isNullable: true,
            comment: 'Máximo de imagens por produto. null = ilimitado.',
          },
          {
            name: 'limit_orders_per_month',
            type: 'integer',
            isNullable: true,
            comment: 'Máximo de pedidos por mês. null = ilimitado.',
          },
          {
            name: 'allows_custom_domain',
            type: 'boolean',
            isNullable: false,
            default: false,
            comment: 'Se a loja pode configurar domínio próprio.',
          },
          {
            name: 'allows_advanced_statistics',
            type: 'boolean',
            isNullable: false,
            default: false,
            comment: 'Se a loja tem acesso a estatísticas avançadas.',
          },
          {
            name: 'allows_chatbot',
            type: 'boolean',
            isNullable: false,
            default: false,
            comment: 'Se a loja pode ativar o chatbot.',
          },
          {
            name: 'has_priority_support',
            type: 'boolean',
            isNullable: false,
            default: false,
            comment: 'Se a loja tem acesso a suporte prioritário.',
          },
          // --- FIM DOS LIMITES ---

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
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('tb_plans');
  }
}
