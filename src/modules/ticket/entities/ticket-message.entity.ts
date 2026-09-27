import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Ticket } from './ticket.entity';

@Entity({ name: 'tb_ticket_messages' })
export class TicketMessage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'ticket_id', type: 'integer', nullable: false })
  ticketId!: number;

  @ManyToOne(() => Ticket, (t) => t.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket!: Ticket;

  @Column({ name: 'author_type', type: 'varchar', length: 20, nullable: false })
  authorType!: 'client' | 'store' | 'admin';

  @Column({ name: 'author_id', type: 'integer', nullable: true })
  authorId!: number | null;

  @Column({ name: 'author_name', type: 'varchar', length: 150, nullable: false })
  authorName!: string;

  @Column({ name: 'message', type: 'text', nullable: false })
  message!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', nullable: false })
  createdAt!: Date;
}
