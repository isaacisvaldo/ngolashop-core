import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { StoreService } from './store.service';
import { UpdateStoreDto } from './dto/update-store.dto';
import { PaginationQueryDto } from '../../common/dtos/pagination-query.dto';
import { JwtAuthGuard } from '../shared/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../shared/auth/decorators/current-user.decorator';

@ApiTags('Stores')
@Controller('store')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Get()
  @ApiOperation({ summary: 'List all stores' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.storeService.findAll(query.page, query.limit);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user store' })
  findMyStore(@CurrentUser('storeId') storeId: number) {
    return this.storeService.findOne(storeId);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get store by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.storeService.findBySlug(slug);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update current user store' })
  updateMyStore(
    @CurrentUser('sub') userId: number,
    @CurrentUser('storeId') storeId: number,
    @Body() updateStoreDto: UpdateStoreDto,
  ) {
    return this.storeService.update(storeId, updateStoreDto, storeId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete store (admin)' })
  remove(@Param('id') id: string) {
    return this.storeService.remove(+id);
  }
}
