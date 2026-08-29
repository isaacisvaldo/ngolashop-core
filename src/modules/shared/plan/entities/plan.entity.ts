import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PlanFeature } from './plan-feature.entity';

@Entity({ name: 'tb_plans' })
export class Plan {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    name: 'name',
    type: 'varchar',
    length: 100,
    nullable: false,
    unique: true,
  })
  name!: string;

  @Column({
    name: 'price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: false,
    default: 0,
  })
  price!: number;

  @Column({ name: 'description', type: 'varchar', length: 255, nullable: true })
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

  @Column({ name: 'limit_products', type: 'integer', nullable: true })
  limitProducts!: number | null;

  @Column({ name: 'limit_images_per_product', type: 'integer', nullable: true })
  limitImagesPerProduct!: number | null;

  @Column({ name: 'limit_orders_per_month', type: 'integer', nullable: true })
  limitOrdersPerMonth!: number | null;

  @Column({ name: 'limit_users', type: 'integer', nullable: true })
  limitUsers!: number | null;

  @Column({
    name: 'allows_custom_domain',
    type: 'boolean',
    nullable: false,
    default: false,
  })
  allowsCustomDomain!: boolean;

  @Column({
    name: 'allows_advanced_statistics',
    type: 'boolean',
    nullable: false,
    default: false,
  })
  allowsAdvancedStatistics!: boolean;

  @Column({
    name: 'allows_chatbot',
    type: 'boolean',
    nullable: false,
    default: false,
  })
  allowsChatbot!: boolean;

  @Column({
    name: 'has_priority_support',
    type: 'boolean',
    nullable: false,
    default: false,
  })
  hasPrioritySupport!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', nullable: false })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: false })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt!: Date;

  @OneToMany(() => PlanFeature, (feature) => feature.plan)
  features!: PlanFeature[];
}
