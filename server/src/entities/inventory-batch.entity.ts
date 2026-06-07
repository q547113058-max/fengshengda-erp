import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './product.entity';
import { PurchaseOrder } from './purchase-order.entity';

export type BatchStatus = 'in_stock' | 'sold_out' | 'transferred';

@Entity('inventory_batches')
export class InventoryBatch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'batch_no', length: 40, unique: true })
  batch_no: string;

  @Column({ name: 'product_id' })
  product_id: number;

  @ManyToOne(() => Product, p => p.batches)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'purchase_order_id', nullable: true })
  purchase_order_id: number;

  @ManyToOne(() => PurchaseOrder)
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder: PurchaseOrder;

  @Column({ name: 'qty_total', type: 'integer' })
  qty_total: number;

  @Column({ name: 'qty_remaining', type: 'integer' })
  qty_remaining: number;

  @Column({ length: 60, nullable: true })
  warehouse: string;

  @Column({ length: 60, nullable: true })
  holder: string;

  @Column({ length: 20, default: 'in_stock' })
  status: BatchStatus;

  @Column({ name: 'created_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
