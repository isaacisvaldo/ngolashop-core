import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { TicketService } from './ticket.service';
import { CreateTicketDto, TicketMessageDto, UpdateTicketDto } from './dto/ticket.dto';
import { AdminListQueryDto } from '../../common/dtos/admin-list-query.dto';
import { requireUserType } from '../../common/require-user-type';
import { JwtAuthGuard } from '../shared/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../shared/auth/guards/admin.guard';
import { CurrentUser } from '../shared/auth/decorators/current-user.decorator';
import type { JwtPayload } from '../shared/auth/decorators/current-user.decorator';
import { RequiredPermissions } from '../shared/auth/decorators/required-permissions.decorator';

class TicketQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  priority?: string;
}

@ApiTags('Support tickets')
@Controller()
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Post('ticket')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Open support ticket (client or store)' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTicketDto) {
    return this.ticketService.create(requireUserType(user, 'client', 'store'), dto);
  }

  @Get('ticket/my')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'My tickets' })
  mine(@CurrentUser() user: JwtPayload) {
    return this.ticketService.findMine(requireUserType(user, 'client', 'store'));
  }

  @Get('ticket/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get my ticket' })
  findMine(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload) {
    return this.ticketService.findOneForOwner(id, requireUserType(user, 'client', 'store'));
  }

  @Post('ticket/:id/messages')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Reply to my ticket' })
  reply(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload, @Body() dto: TicketMessageDto) {
    return this.ticketService.replyAsOwner(id, requireUserType(user, 'client', 'store'), dto.message);
  }

  @Get('admin/tickets')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @RequiredPermissions('ticket.read')
  @ApiOperation({ summary: 'List tickets (admin)' })
  findAdmin(@Query() q: TicketQueryDto) {
    return this.ticketService.findAdmin(q.page, q.limit, q.status, q.search, q.priority);
  }

  @Get('admin/tickets/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @RequiredPermissions('ticket.read')
  @ApiOperation({ summary: 'Get ticket (admin)' })
  findOneAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.ticketService.findOne(id);
  }

  @Post('admin/tickets/:id/messages')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @RequiredPermissions('ticket.write')
  @ApiOperation({ summary: 'Reply to ticket (admin)' })
  replyAdmin(@Param('id', ParseIntPipe) id: number, @CurrentUser('sub') adminId: number, @Body() dto: TicketMessageDto) {
    return this.ticketService.replyAsAdmin(id, adminId, dto.message);
  }

  @Patch('admin/tickets/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @RequiredPermissions('ticket.write')
  @ApiOperation({ summary: 'Update ticket status/priority/assignee (admin)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTicketDto) {
    return this.ticketService.update(id, dto);
  }
}
