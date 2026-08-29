import { AppDataSource } from '../src/database/data-source';

async function resetSchema() {
  await AppDataSource.initialize();
  const queryRunner = AppDataSource.createQueryRunner();

  try {
    await queryRunner.connect();

    // =========================
    // DROP TABLES
    // =========================
    await queryRunner.query(`
      BEGIN
        FOR t IN (SELECT table_name FROM user_tables) LOOP
          BEGIN
            EXECUTE IMMEDIATE 'DROP TABLE "' || t.table_name || '" CASCADE CONSTRAINTS PURGE';
          EXCEPTION
            WHEN OTHERS THEN NULL;
          END;
        END LOOP;
      END;
    `);

    console.log('✓ Tables dropped');

    // =========================
    // DROP VIEWS
    // =========================
    await queryRunner.query(`
      BEGIN
        FOR v IN (SELECT view_name FROM user_views) LOOP
          BEGIN
            EXECUTE IMMEDIATE 'DROP VIEW "' || v.view_name || '"';
          EXCEPTION
            WHEN OTHERS THEN NULL;
          END;
        END LOOP;
      END;
    `);

    console.log('✓ Views dropped');

    // =========================
    // DROP SEQUENCES
    // =========================
    await queryRunner.query(`
      BEGIN
        FOR s IN (SELECT sequence_name FROM user_sequences) LOOP
          BEGIN
            EXECUTE IMMEDIATE 'DROP SEQUENCE "' || s.sequence_name || '"';
          EXCEPTION
            WHEN OTHERS THEN NULL;
          END;
        END LOOP;
      END;
    `);

    console.log('✓ Sequences dropped');

  } catch (err) {
    console.error('Reset failed:', err);
    throw err;
  } finally {
    await queryRunner.release();
    await AppDataSource.destroy();
  }

  console.log('✅ Schema reset complete');
}

resetSchema().catch(console.error);