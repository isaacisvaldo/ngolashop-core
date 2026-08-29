import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Plan } from './plan.entity';

@Entity({ name: 'tb_plan_features' })
export class PlanFeature {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Plan, (plan) => plan.features)
  @JoinColumn({ name: 'plan_id' })
  plan!: Plan;

  @Column({ name: 'text', type: 'varchar', length: 255, nullable: false })
  text!: string;

  @Column({
    name: 'is_included',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  isIncluded!: boolean;

  @Column({ name: 'position', type: 'integer', nullable: false, default: 0 })
  position!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', nullable: false })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: false })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt!: Date;
}
