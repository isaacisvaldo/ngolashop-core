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
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('role')
@UseGuards(JwtAuthGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  create(
    @CurrentUser('rootAdmin') rootAdmin: boolean,
    @Body() createRoleDto: CreateRoleDto,
  ) {
    if (!rootAdmin) {
      throw new Error('Only root admin can create roles');
    }
    return this.roleService.create(createRoleDto);
  }

  @Get()
  findAll(
    @CurrentUser('rootAdmin') rootAdmin: boolean,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!rootAdmin) {
      throw new Error('Only root admin can list roles');
    }
    return this.roleService.findAll(page ? +page : 1, limit ? +limit : 10);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser('rootAdmin') rootAdmin: boolean,
  ) {
    if (!rootAdmin) {
      throw new Error('Only root admin can view roles');
    }
    return this.roleService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('rootAdmin') rootAdmin: boolean,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    if (!rootAdmin) {
      throw new Error('Only root admin can update roles');
    }
    return this.roleService.update(+id, updateRoleDto);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser('rootAdmin') rootAdmin: boolean,
  ) {
    if (!rootAdmin) {
      throw new Error('Only root admin can delete roles');
    }
    return this.roleService.remove(+id);
  }
}
