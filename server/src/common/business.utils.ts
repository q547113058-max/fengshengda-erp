// 业务工具函数 — 收银状态 / 编号生成
import { EntityManager } from 'typeorm';
import { OrderSequence } from '../entities/order-sequence.entity';

export type SettleStatus = 'unpaid' | 'partial' | 'done';

/**
 * 根据已付/总额 计算收银状态
 * - paid >= total 且 total > 0 → done（已结清）
 * - paid > 0 但不足 → partial（部分结）
 * - 其它 → unpaid（未结）
 */
export function calcSettleStatus(paid: number, total: number): SettleStatus {
  if (total > 0 && paid >= total) return 'done';
  if (paid > 0) return 'partial';
  return 'unpaid';
}

/**
 * 业务订单号生成 — 用独立序列表 + 行锁保证并发安全
 * 规则：PO/SO + YYMMDD + 3 位序号
 *
 * 并发安全：
 * 1. SELECT ... FOR UPDATE 锁 order_sequences 行
 * 2. UPDATE last_seq = last_seq + 1
 * 3. 返回 prefix + ymd + 3 位
 *
 * MySQL 用 pessimistic_write 锁；SQLite 整个库是单锁（事务串行）
 */
export async function genOrderNo(
  mgr: EntityManager,
  prefix: 'PO' | 'SO',
  date: string,
): Promise<string> {
  const yy = date.replace(/-/g, '').slice(2); // YYMMDD
  const isMySQL = mgr.connection.options.type === 'mysql';

  let row = isMySQL
    ? await mgr.findOne(OrderSequence, {
        where: { prefix, ymd: yy },
        lock: { mode: 'pessimistic_write' },
      })
    : await mgr.findOne(OrderSequence, { where: { prefix, ymd: yy } });

  if (!row) {
    try {
      row = await mgr.save(
        mgr.create(OrderSequence, { prefix, ymd: yy, last_seq: 1 }),
      );
    } catch {
      row = await mgr.findOneOrFail(OrderSequence, { where: { prefix, ymd: yy } });
    }
    return `${prefix}${yy}-${String(row.last_seq).padStart(3, '0')}`;
  }

  row.last_seq += 1;
  await mgr.save(OrderSequence, row);
  return `${prefix}${yy}-${String(row.last_seq).padStart(3, '0')}`;
}

/**
 * 客户编号生成 — 用独立序列表 + 行锁保证并发安全
 * 规则：CU + YYMMDD + 3 位序号
 */
export async function genCustomerCode(mgr: EntityManager): Promise<string> {
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '').slice(2); // YYMMDD
  const prefix = 'CU';
  const isMySQL = mgr.connection.options.type === 'mysql';

  let row = isMySQL
    ? await mgr.findOne(OrderSequence, {
        where: { prefix, ymd },
        lock: { mode: 'pessimistic_write' },
      })
    : await mgr.findOne(OrderSequence, { where: { prefix, ymd } });

  if (!row) {
    try {
      row = await mgr.save(
        mgr.create(OrderSequence, { prefix, ymd, last_seq: 1 }),
      );
    } catch {
      row = await mgr.findOneOrFail(OrderSequence, { where: { prefix, ymd } });
    }
    return `${prefix}${ymd}-${String(row.last_seq).padStart(3, '0')}`;
  }

  row.last_seq += 1;
  await mgr.save(OrderSequence, row);
  return `${prefix}${ymd}-${String(row.last_seq).padStart(3, '0')}`;
}
