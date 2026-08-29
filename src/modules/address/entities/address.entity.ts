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
import { Province } from '../../shared/province/entities/province.entity';

@Entity({ name: 'tb_addresses' })
export class Address {
  @PrimaryGeneratedColumn()
  id!: number;

  storeId!: number | null;

  @ManyToOne(() => Store, (store) => store.addresses, { nullable: true })
  @JoinColumn({ name: 'store_id' })
  store!: Store | null;

  @Column({ name: 'label', type: 'varchar', length: 100, nullable: true })
  label!: string;

  @Column({ name: 'street', type: 'varchar', length: 255, nullable: false })
  street!: string;

  @Column({ name: 'city', type: 'varchar', length: 100, nullable: false })
  city!: string;

  provinceId!: number | null;

  @ManyToOne(() => Province, { nullable: true })
  @JoinColumn({ name: 'province_id' })
  province!: Province | null;

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
