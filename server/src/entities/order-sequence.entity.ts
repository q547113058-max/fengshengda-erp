// 业务订单号序列表 — 用行锁保证并发安全
import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('order_sequences')
export class OrderSequence {
  // 'PO' / 'SO'
  @PrimaryColumn({ length: 10 })
  prefix: string;

  // YYMMDD 形式
  @PrimaryColumn({ length: 6 })
  ymd: string;

  @Column({ type: 'int', default: 0 })
  last_seq: number;
}
