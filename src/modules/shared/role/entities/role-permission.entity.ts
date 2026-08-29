import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'tb_role_permissions' })
export class RolePermission {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'role_id', type: 'integer', nullable: false })
  roleId!: number;

  @Column({ name: 'permission_id', type: 'integer', nullable: false })
  permissionId!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', nullable: false })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: false })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt!: Date;
}
