import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from '../../product/entities/product.entity';
import { Order } from '../../order/entities/order.entity';
import { Address } from '../../address/entities/address.entity';
import { StoreSubscription } from '../../subscription/entities/subscription.entity';

@Entity({ name: 'tb_stores' })
export class Store {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'name', type: 'varchar', length: 150, nullable: false })
  name!: string;

  @Column({
    name: 'slug',
    type: 'varchar',
    length: 180,
    nullable: false,
    unique: true,
  })
  slug!: string;

  @Column({ name: 'logo_url', type: 'varchar', length: 255, nullable: true })
  logoUrl!: string;

  @Column({ name: 'banner_url', type: 'varchar', length: 255, nullable: true })
  bannerUrl!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description!: string;

  @Column({ name: 'whatsapp', type: 'varchar', length: 20, nullable: false })
  whatsapp!: string;

  @Column({
    name: 'primary_color',
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  primaryColor!: string;

  @Column({
    name: 'is_verified',
    type: 'boolean',
    nullable: false,
    default: false,
  })
  isVerified!: boolean;

  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  isActive!: boolean;

  @Column({
    name: 'has_logistics',
    type: 'boolean',
    nullable: false,
    default: false,
  })
  hasLogistics!: boolean;

  @Column({
    name: 'commission_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  commissionPercentage!: number;

  @Column({
    name: 'average_rating',
    type: 'decimal',
    precision: 3,
    scale: 2,
    nullable: false,
    default: 0,
  })
  averageRating!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', nullable: false })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: false })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt!: Date;

  @OneToMany(() => Product, (product) => product.store)
  products!: Product[];

  @OneToMany(() => Order, (order) => order.store)
  orders!: Order[];

  @OneToMany(() => Address, (address) => address.store)
  addresses: Address[];

  @OneToMany(() => StoreSubscription, (sub) => sub.store)
  subscriptions!: StoreSubscription[];
}
