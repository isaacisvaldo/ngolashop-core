import { Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FavoriteService } from './favorite.service';
import { JwtAuthGuard } from '../shared/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../shared/auth/decorators/current-user.decorator';
import type { JwtPayload } from '../shared/auth/decorators/current-user.decorator';
import { requireUserType } from '../../common/require-user-type';

@ApiTags('Favorites')
@Controller('favorite')
@UseGuards(JwtAuthGuard)
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Get()
  @ApiOperation({ summary: 'List favorite products of current client' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.favoriteService.findAll(requireUserType(user, 'client').sub);
  }

  @Get('ids')
  @ApiOperation({ summary: 'IDs of favorite products' })
  ids(@CurrentUser() user: JwtPayload) {
    return this.favoriteService.ids(requireUserType(user, 'client').sub);
  }

  @Post(':productId')
  @ApiOperation({ summary: 'Add product to favorites' })
  add(@Param('productId', ParseIntPipe) productId: number, @CurrentUser() user: JwtPayload) {
    return this.favoriteService.add(requireUserType(user, 'client').sub, productId);
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Remove product from favorites' })
  remove(@Param('productId', ParseIntPipe) productId: number, @CurrentUser() user: JwtPayload) {
    return this.favoriteService.remove(requireUserType(user, 'client').sub, productId);
  }
}
