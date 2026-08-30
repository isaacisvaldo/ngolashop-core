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
import { Store } from '../../store/entities/store.entity';
import { Category } from '../../shared/category/entities/category.entity';
import { ProductImage } from './product-image.entity';

@Entity({ name: 'tb_products' })
export class Product {
  @PrimaryGeneratedColumn()
  id!: number;

  storeId!: number;

  @ManyToOne(() => Store, (store) => store.products)
  @JoinColumn({ name: 'store_id' })
  store!: Store;

  categoryId!: number | null;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category!: Category | null;

  @Column({ name: 'name', type: 'varchar', length: 200, nullable: false })
  name!: string;

  @Column({ name: 'slug', type: 'varchar', length: 220, nullable: false })
  slug!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description!: string;

  @Column({
    name: 'price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: false,
    default: 0,
  })
  price!: number;

  @Column({
    name: 'compare_at_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  compareAtPrice!: number | null;

  @Column({
    name: 'stock_quantity',
    type: 'integer',
    nullable: false,
    default: 0,
  })
  stockQuantity!: number;

  @Column({ name: 'sku', type: 'varchar', length: 100, nullable: true })
  sku!: string;

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
    name: 'is_featured',
    type: 'boolean',
    nullable: false,
    default: false,
  })
  isFeatured!: boolean;

  @Column({
    name: 'average_rating',
    type: 'decimal',
    precision: 3,
    scale: 2,
    nullable: false,
    default: 0,
  })
  averageRating!: number;

  @Column({ name: 'total_sales', type: 'integer', nullable: false, default: 0 })
  totalSales!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', nullable: false })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: false })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt!: Date;

  @OneToMany(() => ProductImage, (image) => image.product)
  images!: ProductImage[];
}
