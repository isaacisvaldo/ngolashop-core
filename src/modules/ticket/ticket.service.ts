import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketMessage } from './entities/ticket-message.entity';
import { CreateTicketDto, UpdateTicketDto } from './dto/ticket.dto';
import { Client } from '../client/entities/client.entity';
import { User } from '../shared/auth/entities/user.entity';
import { AdminUser } from '../shared/auth/entities/admin-user.entity';
import { JwtPayload } from '../shared/auth/decorators/current-user.decorator';
import { paginate } from '../../common/require-user-type';
import { BillingService } from '../billing/billing.service';

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(Ticket) private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(TicketMessage) private readonly messageRepository: Repository<TicketMessage>,
    @InjectRepository(Client) private readonly clientRepository: Repository<Client>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(AdminUser) private readonly adminRepository: Repository<AdminUser>,
    private readonly billing: BillingService,
  ) {}

  async create(user: JwtPayload, dto: CreateTicketDto) {
    const requester = await this.requester(user);
    const ticket = await this.ticketRepository.save(
      this.ticketRepository.create({
        subject: dto.subject.trim(),
        requesterType: user.type === 'client' ? 'client' : 'store',
        clientId: user.type === 'client' ? user.sub : null,
        userId: user.type === 'store' ? user.sub : null,
        storeId: user.type === 'store' ? (user.storeId ?? null) : null,
        requesterName: requester.name,
        requesterEmail: requester.email,
        priority: await this.priorityFor(user, dto.priority),
      }),
    );
    await this.messageRepository.save(
      this.messageRepository.create({
        ticketId: ticket.id,
        authorType: ticket.requesterType,
        authorId: user.sub,
        authorName: requester.name,
        message: dto.message.trim(),
      }),
    );
    return this.findOne(ticket.id);
  }

  findMine(user: JwtPayload) {
    const where = user.type === 'client' ? { clientId: user.sub } : { storeId: user.storeId ?? -1 };
    return this.ticketRepository.find({ where, order: { updatedAt: 'DESC' } });
  }

  async findOneForOwner(id: number, user: JwtPayload) {
    const ticket = await this.findOne(id);
    const owns =
      (user.type === 'client' && ticket.clientId === user.sub) ||
      (user.type === 'store' && ticket.storeId != null && ticket.storeId === user.storeId);
    if (!owns) throw new NotFoundException(`Ticket #${id} não encontrado`);
    return ticket;
  }

  async findOne(id: number) {
    const ticket = await this.ticketRepository.findOne({
      where: { id },
      relations: { messages: true, store: true, assignedAdmin: true },
      order: { messages: { createdAt: 'ASC' } },
    });
    if (!ticket) throw new NotFoundException(`Ticket #${id} não encontrado`);
    if (ticket.assignedAdmin) {
      const { id: aid, name, email } = ticket.assignedAdmin;
      ticket.assignedAdmin = { id: aid, name, email } as AdminUser;
    }
    return ticket;
  }

  async replyAsOwner(id: number, user: JwtPayload, message: string) {
    const ticket = await this.findOneForOwner(id, user);
    if (ticket.status === 'closed') throw new BadRequestException('Este ticket está fechado');
    const requester = await this.requester(user);
    await this.addMessage(ticket, ticket.requesterType, user.sub, requester.name, message);
    if (ticket.status !== 'open') await this.ticketRepository.update(ticket.id, { status: 'open' });
    return this.findOne(id);
  }

  async replyAsAdmin(id: number, adminId: number, message: string) {
    const ticket = await this.findOne(id);
    const admin = await this.adminRepository.findOne({ where: { id: adminId } });
    await this.addMessage(ticket, 'admin', adminId, admin?.name ?? 'Suporte', message);
    await this.ticketRepository.update(ticket.id, {
      status: ticket.status === 'closed' ? 'closed' : 'in_progress',
      assignedAdminId: ticket.assignedAdminId ?? adminId,
    });
    return this.findOne(id);
  }

  async update(id: number, dto: UpdateTicketDto) {
    const ticket = await this.ticketRepository.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException(`Ticket #${id} não encontrado`);
    if (dto.status) ticket.status = dto.status;
    if (dto.priority) ticket.priority = dto.priority;
    if (dto.assignedAdminId !== undefined) ticket.assignedAdminId = dto.assignedAdminId;
    await this.ticketRepository.save(ticket);
    return this.findOne(id);
  }

  async findAdmin(page = 1, limit = 20, status?: string, search?: string, priority?: string) {
    const qb = this.ticketRepository
      .createQueryBuilder('t')
      .leftJoin('t.assignedAdmin', 'admin')
      .addSelect(['admin.id', 'admin.name'])
      .leftJoin('t.store', 'store')
      .addSelect(['store.id', 'store.name'])
      .orderBy('t.updatedAt', 'DESC');
    if (status) qb.andWhere('t.status = :status', { status });
    if (priority) qb.andWhere('t.priority = :priority', { priority });
    if (search) {
      qb.andWhere('(t.subject ILIKE :s OR t.requesterName ILIKE :s OR t.requesterEmail ILIKE :s)', { s: `%${search}%` });
    }
    const [tickets, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    const messageCounts = tickets.length
      ? await this.messageRepository
          .createQueryBuilder('m')
          .select('m.ticket_id', 'ticketId')
          .addSelect('COUNT(*)', 'count')
          .where('m.ticket_id IN (:...ids)', { ids: tickets.map((t) => t.id) })
          .groupBy('m.ticket_id')
          .getRawMany<{ ticketId: number; count: string }>()
      : [];
    const countMap = new Map(messageCounts.map((m) => [Number(m.ticketId), Number(m.count)]));
    const data = tickets.map((t) => ({ ...t, messageCount: countMap.get(t.id) ?? 0 }));
    const counts = await this.ticketRepository
      .createQueryBuilder('t')
      .select('t.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('t.status')
      .getRawMany<{ status: string; count: string }>();
    return {
      ...paginate(data, total, page, limit),
      counts: Object.fromEntries(counts.map((c) => [c.status, Number(c.count)])),
    };
  }

  private async addMessage(ticket: Ticket, authorType: TicketMessage['authorType'], authorId: number, authorName: string, message: string) {
    await this.messageRepository.save(
      this.messageRepository.create({ ticketId: ticket.id, authorType, authorId, authorName, message: message.trim() }),
    );
    await this.ticketRepository.update(ticket.id, { updatedAt: new Date() });
  }

  /** Lojas Pro/Negócio têm suporte prioritário: os tickets entram com prioridade alta. */
  private async priorityFor(user: JwtPayload, requested?: 'low' | 'medium' | 'high') {
    if (user.type === 'store' && user.storeId) {
      const plan = await this.billing.features(user.storeId);
      if (plan.supportLevel !== 'email') return 'high';
    }
    return requested ?? 'medium';
  }

  private async requester(user: JwtPayload) {
    if (user.type === 'client') {
      const c = await this.clientRepository.findOne({ where: { id: user.sub } });
      if (!c) throw new NotFoundException('Cliente não encontrado');
      return { name: c.name, email: c.email };
    }
    const u = await this.userRepository.findOne({ where: { id: user.sub } });
    if (!u) throw new NotFoundException('Utilizador não encontrado');
    return { name: u.name, email: u.email };
  }
}
