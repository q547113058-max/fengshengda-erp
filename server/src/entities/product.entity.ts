import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { ProductPrice } from './product-price.entity';
import { InventoryBatch } from './inventory-batch.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  category: string;

  @Column({ length: 80, nullable: true })
  origin: string;

  @Column({ name: 'factory_code', length: 80 })
  factory_code: string;

  @Column({ length: 80, nullable: true })
  spec: string;

  @Column({ length: 40, nullable: true })
  grade: string;

  // 库存吨数（鸡爪供应链以吨为单位）
  @Column({ name: 'qty_per_unit', type: 'real', default: 1 })
  qty_per_unit: number;

  @Column({ name: 'goods_location', length: 80, nullable: true })
  goods_location: string;

  @Column({ type: 'text', nullable: true })
  remark: string;

  @Column({ name: 'commission_rate', type: 'real', nullable: true })
  commission_rate: number;

  @Column({ name: 'show_on_website', type: 'boolean', default: false })
  show_on_website: boolean;

  @Column({ name: 'tag_ids', type: 'simple-json', nullable: true })
  tag_ids: number[];

  @Column({ name: 'created_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @OneToMany(() => ProductPrice, pp => pp.product, { cascade: true })
  prices: ProductPrice[];

  @OneToMany(() => InventoryBatch, ib => ib.product)
  batches: InventoryBatch[];
}
