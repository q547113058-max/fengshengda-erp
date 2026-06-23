import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export type CustomerType = '国企' | '贸易商' | '商超' | '加工厂' | '餐饮';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 30 })
  code: string;

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

  /** 所属业务员 user_id（新建时默认=当前登录用户） */
  @Column({ name: 'sales_user_id' })
  sales_user_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sales_user_id' })
  salesUser: User;

  /** 共享给哪些业务员 ID（逗号分隔字符串） */
  @Column({ name: 'shared_to_user_ids', type: 'varchar', length: 500, nullable: true })
  shared_to_user_ids: string | null;

  @Column({ type: 'text', nullable: true })
  remark: string;
}
