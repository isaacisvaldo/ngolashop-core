import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'tb_coupons' })
export class Coupon {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'store_id', type: 'integer' })
  storeId!: number;

  @Column({ name: 'code', type: 'varchar', length: 40 })
  code!: string;

  /** percent | fixed */
  @Column({ name: 'type', type: 'varchar', length: 10 })
  type!: 'percent' | 'fixed';

  @Column({ name: 'value', type: 'decimal', precision: 12, scale: 2 })
  value!: number;

  @Column({ name: 'min_order_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  minOrderAmount!: number | null;

  @Column({ name: 'max_uses', type: 'integer', nullable: true })
  maxUses!: number | null;

  @Column({ name: 'used_count', type: 'integer', default: 0 })
  usedCount!: number;

  @Column({ name: 'starts_at', type: 'timestamp', nullable: true })
  startsAt!: Date | null;

  @Column({ name: 'ends_at', type: 'timestamp', nullable: true })
  endsAt!: Date | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt!: Date | null;
}
