import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from '../../product/entities/product.entity';
import { Order } from '../../order/entities/order.entity';
import { Address } from '../../address/entities/address.entity';
import { StoreSubscription } from '../../subscription/entities/subscription.entity';
import { Category } from '../../shared/category/entities/category.entity';

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

  categoryId!: number | null;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'category_id' })
  category!: Category | null;

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
    name: 'is_published',
    type: 'boolean',
    nullable: false,
    default: false,
  })
  isPublished!: boolean;

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

  @Column({
    name: 'address',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  address!: string | null;

  @Column({
    name: 'pickup_location',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  pickupLocation!: string | null;

  @Column({
    name: 'social_links',
    type: 'jsonb',
    nullable: true,
  })
  socialLinks!: { id: string; nome: string; url: string }[] | null;

  @Column({
    name: 'delivery_zones',
    type: 'jsonb',
    nullable: true,
  })
  deliveryZones!: { id: string; nome: string; custo: number; prazoDias: number }[] | null;

  @Column({
    name: 'payments',
    type: 'jsonb',
    nullable: true,
  })
  payments!: {
    multicaixa: boolean;
    multicaixaRef: string;
    transferencia: boolean;
    transferenciaDados: string;
    entrega: boolean;
  } | null;

  @Column({
    name: 'chatbot',
    type: 'jsonb',
    nullable: true,
  })
  chatbot!: {
    nome: string;
    boasVindas: string;
    horario: string;
    faq: { pergunta: string; resposta: string }[];
  } | null;

  @Column({
    name: 'tags',
    type: 'jsonb',
    nullable: true,
  })
  tags!: string[] | null;

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
