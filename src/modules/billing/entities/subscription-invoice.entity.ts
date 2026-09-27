import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Store } from '../../store/entities/store.entity';
import { Plan } from '../../shared/plan/entities/plan.entity';

export type BillingCycle = 'monthly' | 'quarterly' | 'annual';
export type InvoiceStatus = 'pending' | 'awaiting_validation' | 'paid' | 'rejected' | 'cancelled';
export type PaymentMethod = 'multicaixa_express' | 'reference' | 'transfer';

@Entity({ name: 'tb_subscription_invoices' })
export class SubscriptionInvoice {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'store_id', type: 'integer' })
  storeId!: number;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'store_id' })
  store!: Store;

  /** subscription | wallet_topup */
  @Column({ name: 'kind', type: 'varchar', length: 20, default: 'subscription' })
  kind!: 'subscription' | 'wallet_topup';

  /** Saldo creditado na carteira de destaques (apenas wallet_topup). */
  @Column({ name: 'credit_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  creditAmount!: number | null;

  @Column({ name: 'plan_id', type: 'integer', nullable: true })
  planId!: number | null;

  @ManyToOne(() => Plan, { nullable: true })
  @JoinColumn({ name: 'plan_id' })
  plan!: Plan | null;

  @Column({ name: 'cycle', type: 'varchar', length: 20, nullable: true })
  cycle!: BillingCycle | null;

  @Column({ name: 'period_days', type: 'integer', nullable: true })
  periodDays!: number | null;

  @Column({ name: 'base_amount', type: 'decimal', precision: 12, scale: 2 })
  baseAmount!: number;

  @Column({ name: 'discount_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPercent!: number;

  @Column({ name: 'discount_reason', type: 'varchar', length: 60, nullable: true })
  discountReason!: string | null;

  @Column({ name: 'amount', type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ name: 'status', type: 'varchar', length: 30, default: 'pending' })
  status!: InvoiceStatus;

  @Column({ name: 'payment_method', type: 'varchar', length: 30, nullable: true })
  paymentMethod!: PaymentMethod | null;

  @Column({ name: 'payment_reference', type: 'varchar', length: 120, nullable: true })
  paymentReference!: string | null;

  @Column({ name: 'proof_url', type: 'varchar', length: 500, nullable: true })
  proofUrl!: string | null;

  @Column({ name: 'proof_submitted_at', type: 'timestamp', nullable: true })
  proofSubmittedAt!: Date | null;

  @Column({ name: 'reviewed_by', type: 'integer', nullable: true })
  reviewedBy!: number | null;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt!: Date | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason!: string | null;

  @Column({ name: 'created_by', type: 'integer', nullable: true })
  createdBy!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
