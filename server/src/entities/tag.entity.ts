import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  name: string;

  @Column({ name: 'sort_order', type: 'int', default: 0, unique: true })
  sort_order: number;

  @Column({ name: 'can_delete', type: 'boolean', default: true })
  can_delete: boolean;

  @Column({ name: 'show_on_website', type: 'boolean', default: true })
  show_on_website: boolean;
}
