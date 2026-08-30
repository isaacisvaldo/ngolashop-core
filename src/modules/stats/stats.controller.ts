import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../shared/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../shared/auth/decorators/current-user.decorator';
import { StatsService } from './stats.service';

@ApiTags('Stats')
@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('my')
  @ApiOperation({ summary: 'Get current store statistics' })
  getMyStats(@CurrentUser('storeId') storeId: number) {
    return this.statsService.getStoreStats(storeId);
  }
}
