import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { SalesOrder } from './sales-order.entity';
import { User } from './user.entity';

export type CommissionSettleStatus = 'pending' | 'paid';

@Entity('commission_records')
export class CommissionRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'sales_order_id' })
  sales_order_id: number;

  @ManyToOne(() => SalesOrder)
  @JoinColumn({ name: 'sales_order_id' })
  salesOrder: SalesOrder;

  @Column({ name: 'sales_user_id' })
  sales_user_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sales_user_id' })
  salesUser: User;

  @Column({ type: 'real' })
  rate: number;

  @Column({ type: 'real' })
  amount: number;

  @Column({ name: 'settle_status', length: 20, default: 'pending' })
  settle_status: CommissionSettleStatus;

  @Column({ name: 'settled_at', type: 'datetime', nullable: true })
  settled_at: Date;
}
