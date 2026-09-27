import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Store } from '../../store/entities/store.entity';
import { Plan } from '../../shared/plan/entities/plan.entity';

@Entity({ name: 'tb_store_subscriptions' })
export class StoreSubscription {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'store_id', type: 'integer', nullable: false })
  storeId!: number;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'store_id' })
  store!: Store;

  @Column({ name: 'plan_id', type: 'integer', nullable: false })
  planId!: number;

  @ManyToOne(() => Plan)
  @JoinColumn({ name: 'plan_id' })
  plan!: Plan;

  @Column({ name: 'start_date', type: 'timestamp', nullable: false })
  startDate!: Date;

  @Column({ name: 'end_date', type: 'timestamp', nullable: true })
  endDate!: Date | null;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 30,
    nullable: false,
    default: 'active',
  })
  status!: string;

  @Column({
    name: 'payment_status',
    type: 'varchar',
    length: 30,
    nullable: false,
    default: 'paid',
  })
  paymentStatus!: string;

  @Column({
    name: 'amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  amount!: number | null;

  @Column({
    name: 'duration_days',
    type: 'integer',
    nullable: true,
  })
  durationDays!: number | null;

  @Column({
    name: 'paid_at',
    type: 'timestamp',
    nullable: true,
  })
  paidAt!: Date | null;

  @Column({
    name: 'payment_ref',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  paymentRef!: string | null;

  /** monthly | quarterly | annual | trial */
  @Column({ name: 'cycle', type: 'varchar', length: 20, nullable: true })
  cycle!: string | null;

  /** trial | payment | admin */
  @Column({ name: 'source', type: 'varchar', length: 20, nullable: false, default: 'payment' })
  source!: string;

  @Column({ name: 'invoice_id', type: 'integer', nullable: true })
  invoiceId!: number | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', nullable: false })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: false })
  updatedAt!: Date;
}
