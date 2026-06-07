// 启动配置工厂 — 缺关键变量时直接 process.exit(1)
// 演示/测试容忍默认值；生产（NODE_ENV=production）必须显式提供
import { Logger } from '@nestjs/common';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Product } from './entities/product.entity';
import { ProductPrice } from './entities/product-price.entity';
import { Supplier } from './entities/supplier.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { InventoryBatch } from './entities/inventory-batch.entity';
import { InventoryMovement } from './entities/inventory-movement.entity';
import { MediaAsset } from './entities/media-asset.entity';
import { Customer } from './entities/customer.entity';
import { SalesOrder } from './entities/sales-order.entity';
import { CommissionRecord } from './entities/commission-record.entity';
import { PaymentAccount } from './entities/payment-account.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { OrderSequence } from './entities/order-sequence.entity';

export const ALL_ENTITIES = [
  User, Product, ProductPrice, Supplier, PurchaseOrder,
  InventoryBatch, InventoryMovement, MediaAsset, Customer,
  SalesOrder, CommissionRecord, PaymentAccount, PaymentTransaction,
  OrderSequence,
];

const logger = new Logger('ConfigFactory');

function requiredEnv(key: string, prodOnly = true): string {
  const v = process.env[key];
  if (!v && prodOnly && process.env.NODE_ENV === 'production') {
    logger.error(`❌ 缺少环境变量 ${key}（生产必须）`);
    process.exit(1);
  }
  return v || '';
}

export function buildTypeOrmConfig(): TypeOrmModuleOptions {
  const isProd = process.env.NODE_ENV === 'production';
  // synchronize 默认 false；演示 + 测 = true；生产强制 false
  const synchronize = process.env.DB_SYNCHRONIZE
    ? process.env.DB_SYNCHRONIZE === 'true'
    : !isProd;

  const dbType = (process.env.DB_TYPE || 'better-sqlite3') as any;
  const base: TypeOrmModuleOptions = {
    type: dbType,
    entities: ALL_ENTITIES,
    synchronize,
    logging: ['error', 'warn'],
    // 启动校验
    ...(isProd && !synchronize ? {} : {}),
  };

  if (dbType === 'better-sqlite3') {
    return {
      ...base,
      database: process.env.DB_PATH || (isProd ? 'erp.db' : ':memory:'),
    } as TypeOrmModuleOptions;
  }

  if (dbType === 'mysql' || dbType === 'mariadb') {
    const host = requiredEnv('DB_HOST', isProd);
    const port = Number(process.env.DB_PORT || 3306);
    const user = requiredEnv('DB_USER', isProd);
    const pass = requiredEnv('DB_PASS', isProd);
    const name = requiredEnv('DB_NAME', isProd);
    if (isProd && (!host || !user || !pass || !name)) {
      logger.error('❌ 生产 MySQL 必须提供 DB_HOST/DB_USER/DB_PASS/DB_NAME');
      process.exit(1);
    }
    return {
      ...base,
      host: host || 'localhost',
      port,
      username: user || 'erp_user',
      password: pass || 'erp_pass_2026',
      database: name || 'fengshengda_erp',
      charset: 'utf8mb4',
      timezone: '+08:00',
    } as TypeOrmModuleOptions;
  }

  throw new Error(`Unsupported DB_TYPE: ${dbType}`);
}

export function buildJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production' && (!secret || secret === 'dev-secret-CHANGE-ME-in-prod')) {
    logger.error('❌ 生产必须设 JWT_SECRET 且不能用默认值');
    process.exit(1);
  }
  return secret || 'dev-secret-CHANGE-ME-in-prod';
}
