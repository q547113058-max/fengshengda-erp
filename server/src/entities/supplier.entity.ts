import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('suppliers')
export class Supplier {
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

  @Column({ name: 'settle_type', length: 40, nullable: true })
  settle_type: string;

  @Column({ type: 'text', nullable: true })
  remark: string;
}
