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
import { PaginationQueryDto } from '../../common/dtos/pagination-query.dto';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@ApiTags('Orders')
@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Create order' })
  create(@Body() dto: CreateOrderDto) {
    return this.orderService.create(dto);
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
