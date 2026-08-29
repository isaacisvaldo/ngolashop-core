import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity({ name: 'tb_product_images' })
export class ProductImage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'product_id', type: 'integer', nullable: false })
  productId!: number;

  @ManyToOne(() => Product, (product) => product.images)
  product!: Product;

  @Column({ name: 'url', type: 'varchar', length: 255, nullable: false })
  url!: string;

  @Column({ name: 'alt_text', type: 'varchar', length: 255, nullable: true })
  altText!: string;

  @Column({ name: 'position', type: 'integer', nullable: false, default: 0 })
  position!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', nullable: false })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: false })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt!: Date;
}
