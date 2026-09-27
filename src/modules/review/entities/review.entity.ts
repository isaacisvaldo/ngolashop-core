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
import { Store } from '../../store/entities/store.entity';
import { Product } from '../../product/entities/product.entity';
import { Client } from '../../client/entities/client.entity';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

@Entity({ name: 'tb_reviews' })
export class Review {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'store_id', type: 'integer', nullable: false })
  storeId!: number;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'store_id' })
  store!: Store;

  @Column({ name: 'product_id', type: 'integer', nullable: true })
  productId!: number | null;

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product!: Product | null;

  @Column({ name: 'client_id', type: 'integer', nullable: true })
  clientId!: number | null;

  @ManyToOne(() => Client, { nullable: true })
  @JoinColumn({ name: 'client_id' })
  client!: Client | null;

  @Column({ name: 'order_id', type: 'integer', nullable: true })
  orderId!: number | null;

  @Column({ name: 'author_name', type: 'varchar', length: 150, nullable: false })
  authorName!: string;

  @Column({ name: 'rating', type: 'smallint', nullable: false })
  rating!: number;

  @Column({ name: 'comment', type: 'text', nullable: true })
  comment!: string | null;

  @Column({ name: 'status', type: 'varchar', length: 20, nullable: false, default: 'pending' })
  status!: ReviewStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', nullable: false })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: false })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt!: Date;
}
