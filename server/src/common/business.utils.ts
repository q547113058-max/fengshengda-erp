// 业务工具函数 — 收银状态 / 编号生成

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
 * 业务订单号生成（防并发重号）
 * 规则：PO/SO + YYMMDD + 3 位序号
 * 在事务内调用：先 SELECT MAX(id) + 1（行锁保证串行）
 */
export async function genOrderNo<T extends { id: number }>(
  repo: { find: (opts?: any) => Promise<T[]> },
  prefix: 'PO' | 'SO',
  date: string,
): Promise<string> {
  const rows = (await repo.find({ select: ['id'], order: { id: 'DESC' }, take: 1 } as any)) as T[];
  const nextId = (rows[0]?.id ?? 0) + 1;
  const yy = date.replace(/-/g, '').slice(2);
  return `${prefix}${yy}-${String(nextId).padStart(3, '0')}`;
}
