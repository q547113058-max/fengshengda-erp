import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { ProductPrice } from './product-price.entity';
import { InventoryBatch } from './inventory-batch.entity';
import { MediaAsset } from './media-asset.entity';

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

  @Column({ name: 'qty_per_unit', type: 'integer', default: 1 })
  qty_per_unit: number;

  @Column({ name: 'goods_location', length: 80, nullable: true })
  goods_location: string;

  @Column({ type: 'text', nullable: true })
  remark: string;

  @Column({ name: 'created_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @OneToMany(() => ProductPrice, pp => pp.product, { cascade: true })
  prices: ProductPrice[];

  @OneToMany(() => InventoryBatch, ib => ib.product)
  batches: InventoryBatch[];

  @OneToMany(() => MediaAsset, m => m.product)
  media: MediaAsset[];
}
