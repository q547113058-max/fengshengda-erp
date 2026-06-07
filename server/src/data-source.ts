// TypeORM CLI data-source — 给 migration:generate / migration:run 用
// 跑法：
//   npx typeorm migration:generate -d server/src/data-source.ts src/migrations/Init
//   npx typeorm migration:run -d server/src/data-source.ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { buildTypeOrmConfig } from './config.factory';
import * as dotenv from 'dotenv';

// 加载 .env（如果存在）
dotenv.config();

// 复用 app.module 的 config factory
const base = buildTypeOrmConfig();
export const AppDataSource = new DataSource({
  ...(base as any),
  migrations: ['src/migrations/*.ts'],
});
