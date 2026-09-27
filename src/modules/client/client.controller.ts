import { Body, Controller, Get, Patch, Delete, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ClientService } from './client.service';
import { AdminUpdateClientDto } from './dto/admin-update-client.dto';
import { AdminListQueryDto } from '../../common/dtos/admin-list-query.dto';
import { JwtAuthGuard } from '../shared/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../shared/auth/guards/admin.guard';
import { RequiredPermissions } from '../shared/auth/decorators/required-permissions.decorator';

@ApiTags('Clients (Admin)')
@Controller('admin/clients')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Get()
  @RequiredPermissions('customer.read')
  @ApiOperation({ summary: 'List all clients (admin)' })
  findAll(@Query() query: AdminListQueryDto) {
    return this.clientService.findAll(query.page, query.limit, query.search, query.status);
  }

  @Get(':id')
  @RequiredPermissions('customer.read')
  @ApiOperation({ summary: 'Get client by ID (admin)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clientService.findById(id);
  }

  @Patch(':id')
  @RequiredPermissions('customer.write')
  @ApiOperation({ summary: 'Update client (admin)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: AdminUpdateClientDto) {
    return this.clientService.update(id, dto);
  }

  @Delete(':id')
  @RequiredPermissions('customer.write')
  @ApiOperation({ summary: 'Delete client (admin)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.clientService.remove(id);
  }
}
