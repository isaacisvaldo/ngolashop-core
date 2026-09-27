import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { AuditService } from './audit.service';
import { PaginationQueryDto } from '../../common/dtos/pagination-query.dto';
import { JwtAuthGuard } from '../shared/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../shared/auth/guards/admin.guard';
import { RequiredPermissions } from '../shared/auth/decorators/required-permissions.decorator';

class AuditQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  entity?: string;
}

@ApiTags('Audit (Admin)')
@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, AdminGuard)
@RequiredPermissions('audit.read')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List audit logs' })
  findAll(@Query() query: AuditQueryDto) {
    return this.auditService.findAll(query.page, query.limit, query.search, query.entity);
  }
}
