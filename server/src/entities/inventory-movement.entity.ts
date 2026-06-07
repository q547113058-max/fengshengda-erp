import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { InventoryBatch } from './inventory-batch.entity';

export type MovementType = 'in' | 'out' | 'transfer' | 'loss' | 'return';

@Entity('inventory_movements')
export class InventoryMovement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'batch_id' })
  batch_id: number;

  @ManyToOne(() => InventoryBatch)
  @JoinColumn({ name: 'batch_id' })
  batch: InventoryBatch;

  @Column({ length: 20 })
  type: MovementType;

  @Column({ type: 'integer' })
  qty: number;

  @Column({ length: 60, nullable: true })
  operator: string;

  @Column({ name: 'to_holder', length: 60, nullable: true })
  to_holder: string;

  @Column({ name: 'ref_order_no', length: 40, nullable: true })
  ref_order_no: string;

  @Column({ type: 'text', nullable: true })
  remark: string;

  @Column({ name: 'created_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
