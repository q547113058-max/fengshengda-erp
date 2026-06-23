import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ProductPrice } from './product-price.entity';
import { InventoryBatch } from './inventory-batch.entity';
import { MediaAsset } from './media-asset.entity';

export type Role = 'boss' | 'admin' | 'finance' | 'warehouse' | 'sales';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  username: string;

  @Column({ name: 'full_name', length: 100 })
  full_name: string;

  // bcrypt hash（select: false — 默认 find 拿不到；如要查显式 addSelect）
  @Column({ name: 'password_hash', length: 255, select: false })
  password_hash: string;

  @Column({ length: 20 })
  role: Role;

  @Column({ length: 20, default: 'active' })
  status: string;

  @Column({ name: 'default_commission_rate', type: 'real', default: 0 })
  default_commission_rate: number;

  @Column({ length: 30, nullable: true })
  phone: string;

  @OneToMany(() => ProductPrice, pp => pp.product)
  prices: ProductPrice[];

  @OneToMany(() => InventoryBatch, ib => ib.product)
  batches: InventoryBatch[];

  @OneToMany(() => MediaAsset, m => m.product)
  media: MediaAsset[];
}
