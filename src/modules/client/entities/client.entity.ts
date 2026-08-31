import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'tb_clients' })
export class Client {
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

  @Column({ name: 'phone', type: 'varchar', length: 20, nullable: false, unique: true })
  phone!: string;

  @Column({ name: 'avatar_url', type: 'varchar', length: 255, nullable: true })
  avatarUrl!: string | null;

  @Column({ name: 'province', type: 'varchar', length: 100, nullable: true })
  province!: string | null;

  @Column({ name: 'city', type: 'varchar', length: 100, nullable: true })
  city!: string | null;

  @Column({ name: 'address', type: 'text', nullable: true })
  address!: string | null;

  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  isActive!: boolean;

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
}
