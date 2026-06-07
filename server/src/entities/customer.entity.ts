import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export type CustomerType = '加工厂' | '批发商' | '商超' | '餐饮';
export type CustomerNature = '国企' | '个体户';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120 })
  name: string;

  @Column({ name: 'contact_name', length: 50, nullable: true })
  contact_name: string;

  @Column({ length: 30, nullable: true })
  phone: string;

  @Column({ length: 200, nullable: true })
  address: string;

  @Column({ length: 20 })
  type: CustomerType;

  @Column({ length: 20 })
  nature: CustomerNature;

  @Column({ name: 'sales_user_id' })
  sales_user_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sales_user_id' })
  salesUser: User;

  @Column({ type: 'text', nullable: true })
  remark: string;
}
