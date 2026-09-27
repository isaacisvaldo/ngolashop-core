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
import { Order } from '../../order/entities/order.entity';
import { Store } from '../../store/entities/store.entity';
import { Client } from '../../client/entities/client.entity';

export type DisputeStatus = 'open' | 'in_review' | 'resolved' | 'rejected';

@Entity({ name: 'tb_disputes' })
export class Dispute {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'order_id', type: 'integer', nullable: false })
  orderId!: number;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ name: 'store_id', type: 'integer', nullable: false })
  storeId!: number;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'store_id' })
  store!: Store;

  @Column({ name: 'client_id', type: 'integer', nullable: true })
  clientId!: number | null;

  @ManyToOne(() => Client, { nullable: true })
  @JoinColumn({ name: 'client_id' })
  client!: Client | null;

  @Column({ name: 'reason', type: 'varchar', length: 150, nullable: false })
  reason!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'amount', type: 'decimal', precision: 12, scale: 2, nullable: false, default: 0 })
  amount!: number;

  @Column({ name: 'status', type: 'varchar', length: 20, nullable: false, default: 'open' })
  status!: DisputeStatus;

  @Column({ name: 'resolution', type: 'text', nullable: true })
  resolution!: string | null;

  @Column({ name: 'resolved_by', type: 'integer', nullable: true })
  resolvedBy!: number | null;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', nullable: false })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: false })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt!: Date;
}
