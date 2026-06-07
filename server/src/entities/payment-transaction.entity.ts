import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { PaymentAccount } from './payment-account.entity';
import { User } from './user.entity';

export type Direction = 'in' | 'out';
export type SourceType = 'purchase' | 'sale' | 'commission' | 'manual';

@Entity('payment_transactions')
export class PaymentTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'account_id' })
  account_id: number;

  @ManyToOne(() => PaymentAccount)
  @JoinColumn({ name: 'account_id' })
  account: PaymentAccount;

  @Column({ length: 10 })
  direction: Direction;

  @Column({ type: 'real' })
  amount: number;

  @Column({ name: 'source_type', length: 20 })
  source_type: SourceType;

  @Column({ name: 'ref_order_id', nullable: true })
  ref_order_id: number;

  @Column({ name: 'ref_order_no', length: 30, nullable: true })
  ref_order_no: string;

  @Column({ name: 'counter_party', length: 120, nullable: true })
  counter_party: string;

  @Column({ name: 'operator_id', nullable: true })
  operator_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'operator_id' })
  operator: User;

  @Column({ type: 'text', nullable: true })
  remark: string;

  @Column({ name: 'created_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
