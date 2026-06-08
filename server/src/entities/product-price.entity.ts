import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './product.entity';

@Entity('product_prices')
export class ProductPrice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_id' })
  product_id: number;

  @ManyToOne(() => Product, p => p.prices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'tax_rate', type: 'real', nullable: true })
  tax_rate: number;

  @Column({ type: 'real' })
  price: number;

  @Column({ name: 'effective_from', type: 'date', default: () => 'CURRENT_DATE' })
  effective_from: string;

  // 价格备注（如：1%农副价、散客价、批发价）
  @Column({ type: 'text', nullable: true })
  remark: string;
}
