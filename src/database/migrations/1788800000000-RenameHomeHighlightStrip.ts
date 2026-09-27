import { MigrationInterface, QueryRunner } from 'typeorm';

/** «Carrossel da página inicial» confundia-se com o banner do topo — passa a «Faixa de destaque». */
export class RenameHomeHighlightStrip1788800000000 implements MigrationInterface {
  name = 'RenameHomeHighlightStrip1788800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE tb_highlight_formats
      SET name = 'Faixa de destaque da página inicial',
          description = 'O produto aparece na faixa de destaque logo abaixo do banner da página inicial',
          updated_at = now()
      WHERE key = 'home_carousel' AND name = 'Carrossel da página inicial'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE tb_highlight_formats
      SET name = 'Carrossel da página inicial',
          description = 'O produto aparece no carrossel de destaques da página inicial',
          updated_at = now()
      WHERE key = 'home_carousel' AND name = 'Faixa de destaque da página inicial'`);
  }
}
