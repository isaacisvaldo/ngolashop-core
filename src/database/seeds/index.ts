import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { StorePlansSeed } from './plan/plan';
import { CategoriesSeed } from './category/category';
import { CountrySeed } from './country/country';
import { PaymentMethodSeed } from './payment-method/payment-method';

async function run() {
  console.log('🌱 Seed script started...');

  try {
    await AppDataSource.initialize();
    console.log('📦 DataSource connected');

    await StorePlansSeed(AppDataSource);
    console.log('✅ Plans seeded');

    await CategoriesSeed(AppDataSource);
    console.log('✅ Categories seeded');

    await CountrySeed(AppDataSource);
    console.log('✅ Countries & provinces seeded');

    await PaymentMethodSeed(AppDataSource);
    console.log('✅ Payment methods seeded');

    console.log('🎉 Seeds completed successfully!');
  } catch (error) {
    console.error('❌ Error running seeds:', error);
  } finally {
    await AppDataSource.destroy();
    console.log('🔌 Connection closed');
  }
}

void run();
