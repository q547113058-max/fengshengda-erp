import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Customer } from './customer.entity';
import { User } from './user.entity';
import { Product } from './product.entity';
import { InventoryBatch } from './inventory-batch.entity';

export type ReceiveStatus = 'unpaid' | 'partial' | 'done';

@Entity('sales_orders')
export class SalesOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'so_no', length: 30, unique: true })
  so_no: string;

  @Column({ name: 'customer_id' })
  customer_id: number;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'sales_user_id' })
  sales_user_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sales_user_id' })
  salesUser: User;

  @Column({ name: 'product_id' })
  product_id: number;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'batch_id' })
  batch_id: number;

  @ManyToOne(() => InventoryBatch)
  @JoinColumn({ name: 'batch_id' })
  batch: InventoryBatch;

  @Column({ type: 'integer' })
  qty: number;

  @Column({ name: 'sale_price', type: 'real' })
  sale_price: number;

  @Column({ name: 'tax_rate', type: 'real' })
  tax_rate: number;

  @Column({ name: 'commission_rate', type: 'real' })
  commission_rate: number;

  @Column({ name: 'commission_amt', type: 'real' })
  commission_amt: number;

  @Column({ name: 'receive_status', length: 20, default: 'unpaid' })
  receive_status: ReceiveStatus;

  @Column({ name: 'received_amount', type: 'real', default: 0 })
  received_amount: number;

  @Column({ name: 'sale_date', type: 'date' })
  sale_date: string;

  @Column({ type: 'text', nullable: true })
  remark: string;
}
