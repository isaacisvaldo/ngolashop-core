import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Store } from '../../store/entities/store.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatusHistory } from './order-status-history.entity';
import { Payment } from './payment.entity';

@Entity({ name: 'tb_orders' })
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'store_id', type: 'integer', nullable: false })
  storeId!: number;

  @ManyToOne(() => Store, (store) => store.orders)
  store!: Store;

  @Column({
    name: 'customer_name',
    type: 'varchar',
    length: 150,
    nullable: false,
  })
  customerName!: string;

  @Column({
    name: 'customer_email',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  customerEmail!: string;

  @Column({
    name: 'customer_phone',
    type: 'varchar',
    length: 20,
    nullable: false,
  })
  customerPhone!: string;

  @Column({ name: 'shipping_address', type: 'text', nullable: true })
  shippingAddress!: string;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 30,
    nullable: false,
    default: 'pending',
  })
  status!: string;

  @Column({
    name: 'subtotal',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: false,
    default: 0,
  })
  subtotal!: number;

  @Column({
    name: 'shipping_cost',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: false,
    default: 0,
  })
  shippingCost!: number;

  @Column({
    name: 'total',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: false,
    default: 0,
  })
  total!: number;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string;

  @Column({
    name: 'tracking_code',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  trackingCode!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', nullable: false })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: false })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt!: Date;

  @OneToMany(() => OrderItem, (item) => item.order)
  items!: OrderItem[];

  @OneToMany(() => OrderStatusHistory, (history) => history.order)
  statusHistory!: OrderStatusHistory[];

  @OneToMany(() => Payment, (payment) => payment.order)
  payments!: Payment[];
}
