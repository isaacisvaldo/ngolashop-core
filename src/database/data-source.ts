import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';
import { types } from 'pg';

// Devolve colunas DECIMAL/NUMERIC como number em vez de string
types.setTypeParser(types.builtins.NUMERIC, (value: string) => parseFloat(value));

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

const isLocal = process.env.NODE_ENV !== 'production';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [path.resolve(__dirname, '../modules/**/*.entity{.ts,.js}')],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: ['query', 'error'],
  ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }),
};

export const AppDataSource = new DataSource(dataSourceOptions);
