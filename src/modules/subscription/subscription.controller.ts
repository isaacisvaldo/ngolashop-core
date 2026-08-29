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
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@ApiTags('Subscriptions')
@Controller('subscription')
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post()
  @ApiOperation({ summary: 'Create subscription (admin)' })
  create(@Body() dto: CreateSubscriptionDto) {
    return this.subscriptionService.create(dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get current store active subscription' })
  getMySubscription(@CurrentUser('storeId') storeId: number) {
    return this.subscriptionService.findActiveByStore(storeId);
  }

  @Get('store/:storeId')
  @ApiOperation({ summary: 'List subscriptions for a store' })
  findAll(
    @Param('storeId', ParseIntPipe) storeId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.subscriptionService.findAll(
      storeId,
      page ? +page : 1,
      limit ? +limit : 10,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subscription by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.subscriptionService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update subscription' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.subscriptionService.update(id, dto);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel subscription' })
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.subscriptionService.cancel(id);
  }
}
