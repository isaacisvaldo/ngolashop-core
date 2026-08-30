import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PermissionService } from './permission.service';
import { PaginationQueryDto } from '../../common/dtos/pagination-query.dto';
import { JwtAuthGuard } from '../shared/auth/guards/jwt-auth.guard';

@ApiTags('Permissions')
@Controller('permissions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get()
  @ApiOperation({ summary: 'List all permissions' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.permissionService.findAll(query.page, query.limit);
  }

  @Get('siglas')
  @ApiOperation({ summary: 'Get all permission slugs' })
  findSiglas() {
    return this.permissionService.findSiglas();
  }
}
