import 'reflect-metadata';
import { AppDataSource } from '../data-source';

async function run() {
  console.log('🌱 Seed script iniciado...');

  try {
    await AppDataSource.initialize();
    console.log('📦 DataSource conectado');
    console.log('🎉 Seeds concluídos com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao executar seeds:', error);
  } finally {
    await AppDataSource.destroy();
    console.log('🔌 Conexão fechada');
  }
}

run();
