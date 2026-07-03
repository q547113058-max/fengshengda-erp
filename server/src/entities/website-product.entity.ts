import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('website_products')
export class WebsiteProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  category: string;

  @Column({ name: 'factory_code', length: 80 })
  factory_code: string;

  @Column({ length: 80, nullable: true })
  spec: string;

  @Column({ length: 40, nullable: true })
  grade: string;

  @Column({ length: 80, nullable: true })
  origin: string;

  @Column({ name: 'goods_location', length: 80, nullable: true })
  goods_location: string;

  @Column({ type: 'real', nullable: true })
  price: number;

  @Column({ name: 'price_remark', length: 100, nullable: true })
  price_remark: string;

  @Column({ name: 'stock', type: 'real', nullable: true })
  stock: number;

  @Column({ type: 'text', nullable: true })
  remark: string;

  @Column({ name: 'created_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
