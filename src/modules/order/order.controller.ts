import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../shared/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../shared/auth/decorators/current-user.decorator';
import type { JwtPayload } from '../shared/auth/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../shared/auth/guards/optional-jwt-auth.guard';
import { requireUserType } from '../../common/require-user-type';
import { PaginationQueryDto } from '../../common/dtos/pagination-query.dto';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@ApiTags('Orders')
@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Create order (guest or logged-in client)' })
  create(@Body() dto: CreateOrderDto, @CurrentUser() user?: JwtPayload) {
    return this.orderService.create(dto, user?.type === 'client' ? user.sub : undefined);
  }

  @Get('track')
  @ApiOperation({ summary: 'Public order tracking by reference + phone' })
  track(@Query('ref') ref: string, @Query('phone') phone: string) {
    return this.orderService.track(ref ?? '', phone ?? '');
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  @ApiOperation({ summary: 'Orders of current client' })
  mine(@CurrentUser() user: JwtPayload) {
    return this.orderService.findByClient(requireUserType(user, 'client').sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my/:id')
  @ApiOperation({ summary: 'Order of current client' })
  mineOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload) {
    return this.orderService.findOneForClient(id, requireUserType(user, 'client').sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'List orders for current store' })
  findAll(
    @CurrentUser('storeId') storeId: number,
    @Query() query: PaginationQueryDto,
  ) {
    return this.orderService.findAll(storeId, query.page, query.limit, query.search);
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  @ApiOperation({ summary: 'Get order stats for current store' })
  getStats(@CurrentUser('storeId') storeId: number) {
    return this.orderService.getStats(storeId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('storeId') storeId: number,
  ) {
    return this.orderService.findOne(id, storeId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser('storeId') storeId: number,
    @CurrentUser('sub') userId: number,
  ) {
    return this.orderService.updateStatus(id, storeId, dto, userId);
  }
}
