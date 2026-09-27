import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Store } from '../../store/entities/store.entity';
import { Product } from '../../product/entities/product.entity';

export type HighlightFormatKey = 'category_top' | 'search_top' | 'home_carousel' | 'store_featured';
export type HighlightTarget = 'category' | 'keyword' | 'global' | 'store';
export type HighlightPaidWith = 'wallet' | 'included' | 'reactivation' | 'admin';

@Entity({ name: 'tb_highlight_formats' })
export class HighlightFormat {
  @PrimaryColumn({ name: 'key', type: 'varchar', length: 30 })
  key!: HighlightFormatKey;

  @Column({ name: 'name', type: 'varchar', length: 80 })
  name!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description!: string | null;

  /** category (por categoria) | keyword (por palavra-chave) | global (faixa de destaque da página inicial) | store (lojas recomendadas) */
  @Column({ name: 'target', type: 'varchar', length: 20 })
  target!: HighlightTarget;

  /** Vagas simultâneas por alvo (ex.: 5 por categoria). */
  @Column({ name: 'slots', type: 'integer' })
  slots!: number;

  /** Preço por duração em dias: {"3":800,"7":1500,"15":2700} */
  @Column({ name: 'prices', type: 'jsonb' })
  prices!: Record<string, number>;

  @Column({ name: 'position', type: 'integer', default: 0 })
  position!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}

@Entity({ name: 'tb_wallet_packages' })
export class WalletPackage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'pay_amount', type: 'decimal', precision: 12, scale: 2 })
  payAmount!: number;

  @Column({ name: 'credit_amount', type: 'decimal', precision: 12, scale: 2 })
  creditAmount!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}

@Entity({ name: 'tb_wallet_transactions' })
export class WalletTransaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'store_id', type: 'integer' })
  storeId!: number;

  /** topup | spend | refund | adjustment */
  @Column({ name: 'type', type: 'varchar', length: 20 })
  type!: 'topup' | 'spend' | 'refund' | 'adjustment';

  @Column({ name: 'amount', type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ name: 'balance_after', type: 'decimal', precision: 12, scale: 2 })
  balanceAfter!: number;

  @Column({ name: 'invoice_id', type: 'integer', nullable: true })
  invoiceId!: number | null;

  @Column({ name: 'highlight_id', type: 'integer', nullable: true })
  highlightId!: number | null;

  @Column({ name: 'notes', type: 'varchar', length: 255, nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}

@Entity({ name: 'tb_highlights' })
export class Highlight {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'store_id', type: 'integer' })
  storeId!: number;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'store_id' })
  store!: Store;

  @Column({ name: 'product_id', type: 'integer', nullable: true })
  productId!: number | null;

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product!: Product | null;

  @Column({ name: 'format', type: 'varchar', length: 30 })
  format!: HighlightFormatKey;

  @Column({ name: 'category_id', type: 'integer', nullable: true })
  categoryId!: number | null;

  @Column({ name: 'keyword', type: 'varchar', length: 60, nullable: true })
  keyword!: string | null;

  @Column({ name: 'duration_days', type: 'integer' })
  durationDays!: number;

  @Column({ name: 'starts_at', type: 'timestamp' })
  startsAt!: Date;

  @Column({ name: 'ends_at', type: 'timestamp' })
  endsAt!: Date;

  @Column({ name: 'price', type: 'decimal', precision: 12, scale: 2, default: 0 })
  price!: number;

  @Column({ name: 'paid_with', type: 'varchar', length: 20 })
  paidWith!: HighlightPaidWith;

  /** booked | cancelled (ativo/terminado é calculado pelas datas) */
  @Column({ name: 'status', type: 'varchar', length: 20, default: 'booked' })
  status!: 'booked' | 'cancelled';

  @Column({ name: 'report_sent_at', type: 'timestamp', nullable: true })
  reportSentAt!: Date | null;

  @Column({ name: 'created_by', type: 'integer', nullable: true })
  createdBy!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}

@Entity({ name: 'tb_highlight_credits' })
export class HighlightCredit {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'store_id', type: 'integer' })
  storeId!: number;

  /** reactivation | admin */
  @Column({ name: 'source', type: 'varchar', length: 20 })
  source!: 'reactivation' | 'admin';

  @Column({ name: 'format', type: 'varchar', length: 30 })
  format!: HighlightFormatKey;

  @Column({ name: 'duration_days', type: 'integer' })
  durationDays!: number;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt!: Date;

  @Column({ name: 'used_at', type: 'timestamp', nullable: true })
  usedAt!: Date | null;

  @Column({ name: 'highlight_id', type: 'integer', nullable: true })
  highlightId!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
