import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DisputeService } from './dispute.service';
import { CreateDisputeDto, UpdateDisputeDto } from './dto/dispute.dto';
import { AdminListQueryDto } from '../../common/dtos/admin-list-query.dto';
import { requireUserType } from '../../common/require-user-type';
import { JwtAuthGuard } from '../shared/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../shared/auth/guards/admin.guard';
import { CurrentUser } from '../shared/auth/decorators/current-user.decorator';
import type { JwtPayload } from '../shared/auth/decorators/current-user.decorator';
import { RequiredPermissions } from '../shared/auth/decorators/required-permissions.decorator';

@ApiTags('Disputes')
@Controller()
export class DisputeController {
  constructor(private readonly disputeService: DisputeService) {}

  @Post('dispute')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Client opens a dispute' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateDisputeDto) {
    return this.disputeService.create(requireUserType(user, 'client').sub, dto);
  }

  @Get('dispute/my')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Disputes of current client' })
  mine(@CurrentUser() user: JwtPayload) {
    return this.disputeService.findByClient(requireUserType(user, 'client').sub);
  }

  @Get('dispute/store')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Disputes of current store' })
  store(@CurrentUser() user: JwtPayload) {
    return this.disputeService.findByStore(requireUserType(user, 'store').storeId!);
  }

  @Get('admin/disputes')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @RequiredPermissions('dispute.read')
  @ApiOperation({ summary: 'List disputes (admin)' })
  findAdmin(@Query() q: AdminListQueryDto) {
    return this.disputeService.findAdmin(q.page, q.limit, q.status, q.search);
  }

  @Patch('admin/disputes/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @RequiredPermissions('dispute.write')
  @ApiOperation({ summary: 'Arbitrate dispute (admin)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDisputeDto, @CurrentUser('sub') adminId: number) {
    return this.disputeService.update(id, dto, adminId);
  }
}
