import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminPanelService } from './admin-panel.service';
import { AdminOrderQueryDto, UpdateStoreUserDto } from './dto/admin-panel.dto';
import { PaginationQueryDto } from '../../common/dtos/pagination-query.dto';
import { UpdateOrderStatusDto } from '../order/dto/update-order-status.dto';
import { CreateUserDto } from '../store/user/dto/create-user.dto';
import { UserService } from '../store/user/user.service';
import { JwtAuthGuard } from '../shared/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../shared/auth/guards/admin.guard';
import { RequiredPermissions } from '../shared/auth/decorators/required-permissions.decorator';

@ApiTags('Admin panel')
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminPanelController {
  constructor(
    private readonly adminPanelService: AdminPanelService,
    private readonly userService: UserService,
  ) {}

  @Get('dashboard')
  @RequiredPermissions('dashboard.read')
  @ApiOperation({ summary: 'Dashboard KPIs, charts and alerts' })
  dashboard() {
    return this.adminPanelService.dashboard();
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Operational alerts' })
  alerts() {
    return this.adminPanelService.alerts();
  }

  @Get('orders')
  @RequiredPermissions('order.read')
  @ApiOperation({ summary: 'List all platform orders' })
  listOrders(@Query() q: AdminOrderQueryDto) {
    return this.adminPanelService.listOrders(q.page, q.limit, q.status, q.search, q.storeId);
  }

  @Get('orders/:id')
  @RequiredPermissions('order.read')
  @ApiOperation({ summary: 'Get order detail' })
  getOrder(@Param('id', ParseIntPipe) id: number) {
    return this.adminPanelService.getOrder(id);
  }

  @Patch('orders/:id/status')
  @RequiredPermissions('order.write')
  @ApiOperation({ summary: 'Change order status' })
  updateOrderStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOrderStatusDto) {
    return this.adminPanelService.updateOrderStatus(id, dto);
  }

  @Get('store-users')
  @RequiredPermissions('admin-user.read')
  @ApiOperation({ summary: 'List all store users' })
  listStoreUsers(@Query() q: PaginationQueryDto) {
    return this.adminPanelService.listStoreUsers(q.page, q.limit, q.search);
  }

  @Patch('store-users/:id')
  @RequiredPermissions('store.write')
  @ApiOperation({ summary: 'Activate / suspend store user' })
  updateStoreUser(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStoreUserDto) {
    return this.adminPanelService.updateStoreUser(id, dto.isActive);
  }

  @Get('stores/:id/overview')
  @RequiredPermissions('store.read')
  @ApiOperation({ summary: 'Store detail: team, stats, orders' })
  storeOverview(@Param('id', ParseIntPipe) id: number) {
    return this.adminPanelService.storeOverview(id);
  }

  @Post('stores/:id/users')
  @RequiredPermissions('store.write')
  @ApiOperation({ summary: 'Add user to store team' })
  async addStoreUser(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateUserDto) {
    const { password: _p, refreshToken: _r, ...user } = await this.userService.create(id, dto);
    return user;
  }
}
