import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Store } from '../../store/entities/store.entity';

@Entity({ name: 'tb_addresses' })
export class Address {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'store_id', type: 'integer', nullable: true })
  storeId!: number | null;

  @ManyToOne(() => Store, (store) => store.addresses, { nullable: true })
  store!: Store | null;

  @Column({ name: 'label', type: 'varchar', length: 100, nullable: true })
  label!: string;

  @Column({ name: 'street', type: 'varchar', length: 255, nullable: false })
  street!: string;

  @Column({ name: 'city', type: 'varchar', length: 100, nullable: false })
  city!: string;

  @Column({ name: 'province', type: 'varchar', length: 100, nullable: true })
  province!: string;

  @Column({ name: 'postal_code', type: 'varchar', length: 20, nullable: true })
  postalCode!: string;

  @Column({
    name: 'country',
    type: 'varchar',
    length: 100,
    nullable: false,
    default: 'Angola',
  })
  country!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', nullable: false })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: false })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt!: Date;
}
