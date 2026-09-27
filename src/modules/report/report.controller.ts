import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { ReportService } from './report.service';
import { CreateReportDto, UpdateReportDto } from './dto/report.dto';
import { AdminListQueryDto } from '../../common/dtos/admin-list-query.dto';
import { JwtAuthGuard } from '../shared/auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../shared/auth/guards/optional-jwt-auth.guard';
import { AdminGuard } from '../shared/auth/guards/admin.guard';
import { CurrentUser } from '../shared/auth/decorators/current-user.decorator';
import type { JwtPayload } from '../shared/auth/decorators/current-user.decorator';
import { RequiredPermissions } from '../shared/auth/decorators/required-permissions.decorator';

class ReportQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsIn(['store', 'product', 'review', 'client'])
  targetType?: string;
}

@ApiTags('Reports')
@Controller()
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post('report')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Submit a report (anonymous or logged-in client)' })
  create(@Body() dto: CreateReportDto, @CurrentUser() user?: JwtPayload) {
    return this.reportService.create(dto, user?.type === 'client' ? user.sub : undefined);
  }

  @Get('admin/reports')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @RequiredPermissions('report.read')
  @ApiOperation({ summary: 'List reports (admin)' })
  findAdmin(@Query() q: ReportQueryDto) {
    return this.reportService.findAdmin(q.page, q.limit, q.status, q.search, q.targetType);
  }

  @Patch('admin/reports/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @RequiredPermissions('report.write')
  @ApiOperation({ summary: 'Update report status (admin)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReportDto) {
    return this.reportService.updateStatus(id, dto.status);
  }
}
