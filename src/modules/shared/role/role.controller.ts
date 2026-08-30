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
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PaginationQueryDto } from '../../../common/dtos/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Roles')
@Controller('role')
@UseGuards(JwtAuthGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @ApiOperation({ summary: 'Create role (root admin only)' })
  create(
    @CurrentUser('rootAdmin') rootAdmin: boolean,
    @Body() createRoleDto: CreateRoleDto,
  ) {
    if (!rootAdmin) {
      throw new ForbiddenException('Only root admin can create roles');
    }
    return this.roleService.create(createRoleDto);
  }

  @Get()
  @ApiOperation({ summary: 'List roles (root admin only)' })
  findAll(
    @CurrentUser('rootAdmin') rootAdmin: boolean,
    @Query() query: PaginationQueryDto,
  ) {
    if (!rootAdmin) {
      throw new ForbiddenException('Only root admin can list roles');
    }
    return this.roleService.findAll(query.page, query.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role by ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('rootAdmin') rootAdmin: boolean,
  ) {
    if (!rootAdmin) {
      throw new ForbiddenException('Only root admin can view roles');
    }
    return this.roleService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update role (root admin only)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('rootAdmin') rootAdmin: boolean,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    if (!rootAdmin) {
      throw new ForbiddenException('Only root admin can update roles');
    }
    return this.roleService.update(id, updateRoleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete role (root admin only)' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('rootAdmin') rootAdmin: boolean,
  ) {
    if (!rootAdmin) {
      throw new ForbiddenException('Only root admin can delete roles');
    }
    return this.roleService.remove(id);
  }
}
