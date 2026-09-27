import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Product } from '../../product/entities/product.entity';

@Entity({ name: 'tb_favorites' })
export class Favorite {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'client_id', type: 'integer', nullable: false })
  clientId!: number;

  @Column({ name: 'product_id', type: 'integer', nullable: false })
  productId!: number;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', nullable: false })
  createdAt!: Date;
}
