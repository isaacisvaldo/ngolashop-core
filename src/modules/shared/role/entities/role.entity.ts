import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'tb_roles' })
export class Role {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'name', type: 'varchar', length: 50, nullable: false })
  name!: string;

  @Column({ name: 'description', type: 'varchar', length: 500, nullable: true })
  description!: string;

  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', nullable: false })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: false })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt!: Date;
}
