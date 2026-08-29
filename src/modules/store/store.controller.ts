import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StoreService } from './store.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { JwtAuthGuard } from '../shared/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../shared/auth/decorators/current-user.decorator';

@Controller('store')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser('sub') userId: number,
    @Body() createStoreDto: CreateStoreDto,
  ) {
    return this.storeService.create(userId, createStoreDto);
  }

  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.storeService.findAll(page ? +page : 1, limit ? +limit : 10);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  findMyStore(@CurrentUser('storeId') storeId: number) {
    return this.storeService.findOne(storeId);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.storeService.findBySlug(slug);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMyStore(
    @CurrentUser('sub') userId: number,
    @CurrentUser('storeId') storeId: number,
    @Body() updateStoreDto: UpdateStoreDto,
  ) {
    return this.storeService.update(storeId, updateStoreDto, storeId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.storeService.remove(+id);
  }
}
