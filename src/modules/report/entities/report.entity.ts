import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ReportTargetType = 'store' | 'product' | 'review' | 'client';
export type ReportStatus = 'open' | 'in_review' | 'resolved' | 'dismissed';

@Entity({ name: 'tb_reports' })
export class Report {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'target_type', type: 'varchar', length: 20, nullable: false })
  targetType!: ReportTargetType;

  @Column({ name: 'target_id', type: 'integer', nullable: false })
  targetId!: number;

  @Column({ name: 'target_label', type: 'varchar', length: 200, nullable: true })
  targetLabel!: string | null;

  @Column({ name: 'reason', type: 'varchar', length: 150, nullable: false })
  reason!: string;

  @Column({ name: 'details', type: 'text', nullable: true })
  details!: string | null;

  @Column({ name: 'client_id', type: 'integer', nullable: true })
  clientId!: number | null;

  @Column({ name: 'reporter_name', type: 'varchar', length: 150, nullable: true })
  reporterName!: string | null;

  @Column({ name: 'reporter_email', type: 'varchar', length: 150, nullable: true })
  reporterEmail!: string | null;

  @Column({ name: 'status', type: 'varchar', length: 20, nullable: false, default: 'open' })
  status!: ReportStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', nullable: false })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: false })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt!: Date;
}
