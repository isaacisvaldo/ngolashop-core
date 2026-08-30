import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'tb_admin_user_permissions' })
export class AdminUserPermission {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'admin_user_id', type: 'integer', nullable: false })
  adminUserId!: number;

  @Column({ name: 'permission_id', type: 'integer', nullable: false })
  permissionId!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', nullable: false })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: false })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt!: Date;
}
