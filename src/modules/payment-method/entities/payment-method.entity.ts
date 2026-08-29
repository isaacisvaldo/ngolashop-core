import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'tb_payment_methods' })
export class PaymentMethod {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'name', type: 'varchar', length: 100, nullable: false })
  name!: string;

  @Column({
    name: 'slug',
    type: 'varchar',
    length: 120,
    nullable: false,
    unique: true,
  })
  slug!: string;

  @Column({ name: 'icon_url', type: 'varchar', length: 255, nullable: true })
  iconUrl!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description!: string;

  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  isActive!: boolean;

  @Column({ name: 'position', type: 'integer', nullable: false, default: 0 })
  position!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', nullable: false })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: false })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt!: Date;
}
