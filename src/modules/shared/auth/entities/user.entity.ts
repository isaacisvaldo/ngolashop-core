import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Store } from '../../store/entities/store.entity';

@Entity({ name: 'tb_users' })
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'name', type: 'varchar', length: 150, nullable: false })
  name!: string;

  @Column({
    name: 'email',
    type: 'varchar',
    length: 150,
    nullable: false,
    unique: true,
  })
  email!: string;

  @Column({ name: 'password', type: 'varchar', length: 255, nullable: false })
  password!: string;

  @Column({ name: 'phone', type: 'varchar', length: 20, nullable: false })
  phone!: string;

  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  isActive!: boolean;

  @Column({
    name: 'root_admin',
    type: 'boolean',
    nullable: false,
    default: false,
  })
  rootAdmin!: boolean;

  @Column({ name: 'store_id', type: 'integer', nullable: true })
  storeId!: number | null;

  @Column({
    name: 'refresh_token',
    type: 'varchar',
    length: 512,
    nullable: true,
  })
  refreshToken!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', nullable: false })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: false })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt!: Date;

  @OneToMany(() => Store, (store) => store.user)
  stores!: Store[];
}
