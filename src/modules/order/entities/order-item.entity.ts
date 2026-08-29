import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Product } from '../../product/entities/product.entity';

@Entity({ name: 'tb_order_items' })
export class OrderItem {
  @PrimaryGeneratedColumn()
  id!: number;

  orderId!: number;

  @ManyToOne(() => Order, (order) => order.items)
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  productId!: number;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Column({
    name: 'product_name',
    type: 'varchar',
    length: 200,
    nullable: false,
  })
  productName!: string;

  @Column({
    name: 'product_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: false,
  })
  productPrice!: number;

  @Column({ name: 'quantity', type: 'integer', nullable: false, default: 1 })
  quantity!: number;

  @Column({
    name: 'subtotal',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: false,
  })
  subtotal!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', nullable: false })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: false })
  updatedAt!: Date;
}
