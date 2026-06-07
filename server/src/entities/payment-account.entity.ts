import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export type AccountType = 'public' | 'wx_private' | 'alipay' | 'cash' | 'other';

@Entity('payment_accounts')
export class PaymentAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 80 })
  name: string;

  @Column({ length: 20 })
  type: AccountType;

  @Column({ name: 'is_company', default: false })
  is_company: boolean;

  @Column({ length: 20, default: 'active' })
  status: string;

  @Column({ name: 'opening_balance', type: 'real', default: 0 })
  opening_balance: number;
}
