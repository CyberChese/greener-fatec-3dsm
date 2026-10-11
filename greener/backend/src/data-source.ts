import 'reflect-metadata';
import 'dotenv/config';
import { join } from 'node:path';
import { DataSource, type DataSourceOptions } from 'typeorm';

export const databaseOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,

  entities: [
    join(__dirname, 'entities', '*.entity{.ts,.js}'),
  ],
  migrations: [
    join(__dirname, 'migrations', '*{.ts,.js}'),
  ],

  synchronize: false,
  migrationsRun: false,
};

export default new DataSource(databaseOptions);