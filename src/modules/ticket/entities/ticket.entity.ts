import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Store } from '../../store/entities/store.entity';
import { AdminUser } from '../../shared/auth/entities/admin-user.entity';
import { TicketMessage } from './ticket-message.entity';

export type TicketStatus = 'open' | 'in_progress' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high';

@Entity({ name: 'tb_tickets' })
export class Ticket {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'subject', type: 'varchar', length: 200, nullable: false })
  subject!: string;

  @Column({ name: 'requester_type', type: 'varchar', length: 20, nullable: false })
  requesterType!: 'client' | 'store';

  @Column({ name: 'client_id', type: 'integer', nullable: true })
  clientId!: number | null;

  @Column({ name: 'user_id', type: 'integer', nullable: true })
  userId!: number | null;

  @Column({ name: 'store_id', type: 'integer', nullable: true })
  storeId!: number | null;

  @ManyToOne(() => Store, { nullable: true })
  @JoinColumn({ name: 'store_id' })
  store!: Store | null;

  @Column({ name: 'requester_name', type: 'varchar', length: 150, nullable: false })
  requesterName!: string;

  @Column({ name: 'requester_email', type: 'varchar', length: 150, nullable: true })
  requesterEmail!: string | null;

  @Column({ name: 'priority', type: 'varchar', length: 10, nullable: false, default: 'medium' })
  priority!: TicketPriority;

  @Column({ name: 'status', type: 'varchar', length: 20, nullable: false, default: 'open' })
  status!: TicketStatus;

  @Column({ name: 'assigned_admin_id', type: 'integer', nullable: true })
  assignedAdminId!: number | null;

  @ManyToOne(() => AdminUser, { nullable: true })
  @JoinColumn({ name: 'assigned_admin_id' })
  assignedAdmin!: AdminUser | null;

  @OneToMany(() => TicketMessage, (m) => m.ticket)
  messages!: TicketMessage[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', nullable: false })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: false })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt!: Date;
}
