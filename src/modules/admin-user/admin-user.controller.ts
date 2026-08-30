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
  ForbiddenException,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminUserService } from './admin-user.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { PaginationQueryDto } from '../../common/dtos/pagination-query.dto';
import { JwtAuthGuard } from '../shared/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../shared/auth/decorators/current-user.decorator';

@ApiTags('Admin Users')
@Controller('admin-users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @Post()
  @ApiOperation({ summary: 'Create admin user (root admin only)' })
  create(
    @CurrentUser('rootAdmin') rootAdmin: boolean,
    @Body() dto: CreateAdminUserDto,
  ) {
    if (!rootAdmin) {
      throw new ForbiddenException('Only root admin can create admin users');
    }
    return this.adminUserService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List admin users (root admin only)' })
  findAll(
    @CurrentUser('rootAdmin') rootAdmin: boolean,
    @Query() query: PaginationQueryDto & { search?: string },
  ) {
    if (!rootAdmin) {
      throw new ForbiddenException('Only root admin can list admin users');
    }
    return this.adminUserService.findAll(query.page, query.limit, query.search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get admin user by ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('rootAdmin') rootAdmin: boolean,
  ) {
    if (!rootAdmin) {
      throw new ForbiddenException('Only root admin can view admin users');
    }
    return this.adminUserService.findOneWithPermissions(id);
  }

  @Get(':id/permissions')
  @ApiOperation({ summary: 'Get admin user individual permissions' })
  getUserPermissions(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('rootAdmin') rootAdmin: boolean,
  ) {
    if (!rootAdmin) {
      throw new ForbiddenException('Only root admin can view user permissions');
    }
    return this.adminUserService.getUserPermissions(id);
  }

  @Patch(':id/permissions')
  @ApiOperation({ summary: 'Update admin user individual permissions' })
  updateUserPermissions(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('rootAdmin') rootAdmin: boolean,
    @Body() body: { permissionIds: number[] },
  ) {
    if (!rootAdmin) {
      throw new ForbiddenException('Only root admin can update user permissions');
    }
    return this.adminUserService.updateUserPermissions(id, body.permissionIds);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update admin user (root admin only)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('rootAdmin') rootAdmin: boolean,
    @Body() dto: UpdateAdminUserDto,
  ) {
    if (!rootAdmin) {
      throw new ForbiddenException('Only root admin can update admin users');
    }
    return this.adminUserService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete admin user (root admin only)' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('rootAdmin') rootAdmin: boolean,
  ) {
    if (!rootAdmin) {
      throw new ForbiddenException('Only root admin can delete admin users');
    }
    return this.adminUserService.remove(id);
  }
}
