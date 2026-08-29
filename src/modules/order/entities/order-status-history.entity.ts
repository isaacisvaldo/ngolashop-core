import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Entity({ name: 'tb_order_status_history' })
export class OrderStatusHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'order_id', type: 'integer', nullable: false })
  orderId!: number;

  @ManyToOne(() => Order, (order) => order.statusHistory)
  order!: Order;

  @Column({ name: 'status', type: 'varchar', length: 30, nullable: false })
  status!: string;

  @Column({ name: 'note', type: 'text', nullable: true })
  note!: string;

  @Column({ name: 'changed_by', type: 'integer', nullable: true })
  changedBy!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', nullable: false })
  createdAt!: Date;
}
