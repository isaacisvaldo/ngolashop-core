import { Controller, Get, Patch, Delete, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ClientService } from './client.service';
import { UpdateClientDto } from './dto/update-client.dto';
import { JwtAuthGuard } from '../shared/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../shared/auth/guards/admin.guard';

@ApiTags('Clients (Admin)')
@Controller('admin/clients')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Get()
  @ApiOperation({ summary: 'List all clients (admin)' })
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.clientService.findAll(page ? +page : 1, limit ? +limit : 10);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get client by ID (admin)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clientService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update client (admin)' })
  update(@Param('id', ParseIntPipe) id: number, @Query() dto: UpdateClientDto) {
    return this.clientService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete client (admin)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.clientService.remove(id);
  }
}
