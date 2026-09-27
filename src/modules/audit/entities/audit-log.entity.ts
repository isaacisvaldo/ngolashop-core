import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'tb_audit_logs' })
export class AuditLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'admin_user_id', type: 'integer', nullable: true })
  adminUserId!: number | null;

  @Column({ name: 'actor_name', type: 'varchar', length: 150, nullable: true })
  actorName!: string | null;

  @Column({ name: 'actor_email', type: 'varchar', length: 150, nullable: true })
  actorEmail!: string | null;

  @Column({ name: 'action', type: 'varchar', length: 20, nullable: false })
  action!: string;

  @Column({ name: 'entity', type: 'varchar', length: 80, nullable: false })
  entity!: string;

  @Column({ name: 'entity_id', type: 'varchar', length: 50, nullable: true })
  entityId!: string | null;

  @Column({ name: 'path', type: 'varchar', length: 255, nullable: false })
  path!: string;

  @Column({ name: 'details', type: 'jsonb', nullable: true })
  details!: Record<string, unknown> | null;

  @Column({ name: 'ip', type: 'varchar', length: 64, nullable: true })
  ip!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', nullable: false })
  createdAt!: Date;
}
