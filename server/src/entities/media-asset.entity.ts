import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './product.entity';
import { InventoryBatch } from './inventory-batch.entity';
import { User } from './user.entity';

@Entity('media_assets')
export class MediaAsset {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_id', nullable: true })
  product_id: number;

  @ManyToOne(() => Product, p => p.media)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'batch_id', nullable: true })
  batch_id: number;

  @ManyToOne(() => InventoryBatch)
  @JoinColumn({ name: 'batch_id' })
  batch: InventoryBatch;

  @Column({ length: 10 })
  type: 'image' | 'video';

  @Column({ name: 'file_path', length: 300 })
  file_path: string;

  @Column({ length: 300, nullable: true })
  thumb: string;

  @Column({ name: 'uploader_id', nullable: true })
  uploader_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploader_id' })
  uploader: User;

  @Column({ name: 'created_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
