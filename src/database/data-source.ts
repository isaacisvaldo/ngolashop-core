import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

config({
  path: (() => {
    switch (process.env.NODE_ENV) {
      case 'production':
        return '.env.prod';
      case 'preprod':
        return '.env.preprod';
      default:
        return '.env.dev';
    }
  })(),
});

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: ['query', 'error'],
  ssl: {
    rejectUnauthorized: false,
  },
};

export const AppDataSource = new DataSource(dataSourceOptions);
