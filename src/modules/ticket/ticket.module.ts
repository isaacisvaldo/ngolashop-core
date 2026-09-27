import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketMessage } from './entities/ticket-message.entity';
import { Client } from '../client/entities/client.entity';
import { User } from '../shared/auth/entities/user.entity';
import { AdminUser } from '../shared/auth/entities/admin-user.entity';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller';
import { AuthModule } from '../shared/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, TicketMessage, Client, User, AdminUser]), AuthModule],
  controllers: [TicketController],
  providers: [TicketService],
})
export class TicketModule {}
