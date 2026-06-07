import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Supplier } from './supplier.entity';
import { Product } from './product.entity';
import { User } from './user.entity';

export type SettleStatus = 'unpaid' | 'partial' | 'done';

@Entity('purchase_orders')
export class PurchaseOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'po_no', length: 30, unique: true })
  po_no: string;

  @Column({ name: 'supplier_id' })
  supplier_id: number;

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({ name: 'product_id' })
  product_id: number;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'integer' })
  qty: number;

  @Column({ name: 'cost_price', type: 'real' })
  cost_price: number;

  @Column({ name: 'purchase_date', type: 'date' })
  purchase_date: string;

  @Column({ name: 'settle_status', length: 20, default: 'unpaid' })
  settle_status: SettleStatus;

  @Column({ name: 'paid_amount', type: 'real', default: 0 })
  paid_amount: number;

  @Column({ type: 'text', nullable: true })
  remark: string;

  @Column({ name: 'created_by', nullable: true })
  created_by: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;
}
