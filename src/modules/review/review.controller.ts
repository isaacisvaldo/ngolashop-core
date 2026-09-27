import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReviewService } from './review.service';
import { CreateReviewDto, UpdateReviewStatusDto } from './dto/review.dto';
import { PaginationQueryDto } from '../../common/dtos/pagination-query.dto';
import { AdminListQueryDto } from '../../common/dtos/admin-list-query.dto';
import { requireUserType } from '../../common/require-user-type';
import { JwtAuthGuard } from '../shared/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../shared/auth/guards/admin.guard';
import { CurrentUser } from '../shared/auth/decorators/current-user.decorator';
import type { JwtPayload } from '../shared/auth/decorators/current-user.decorator';
import { RequiredPermissions } from '../shared/auth/decorators/required-permissions.decorator';

@ApiTags('Reviews')
@Controller()
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post('review')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Client creates a review' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateReviewDto) {
    return this.reviewService.create(requireUserType(user, 'client').sub, dto);
  }

  @Get('review/my')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Reviews of current client' })
  mine(@CurrentUser() user: JwtPayload) {
    return this.reviewService.findByClient(requireUserType(user, 'client').sub);
  }

  @Get('review/product/:id')
  @ApiOperation({ summary: 'Approved reviews of a product' })
  byProduct(@Param('id', ParseIntPipe) id: number, @Query() q: PaginationQueryDto) {
    return this.reviewService.findPublic({ productId: id }, q.page, q.limit);
  }

  @Get('review/store/:id')
  @ApiOperation({ summary: 'Approved reviews of a store' })
  byStore(@Param('id', ParseIntPipe) id: number, @Query() q: PaginationQueryDto) {
    return this.reviewService.findPublic({ storeId: id }, q.page, q.limit);
  }

  @Get('admin/reviews')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @RequiredPermissions('review.read')
  @ApiOperation({ summary: 'List reviews (admin)' })
  findAdmin(@Query() q: AdminListQueryDto) {
    return this.reviewService.findAdmin(q.page, q.limit, q.status, q.search);
  }

  @Patch('admin/reviews/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @RequiredPermissions('review.write')
  @ApiOperation({ summary: 'Moderate review (admin)' })
  moderate(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReviewStatusDto) {
    return this.reviewService.updateStatus(id, dto.status);
  }

  @Delete('admin/reviews/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @RequiredPermissions('review.write')
  @ApiOperation({ summary: 'Delete review (admin)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.reviewService.remove(id);
  }
}
