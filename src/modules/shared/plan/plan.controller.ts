import {
  Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PlanService } from './plan.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Plans')
@Controller('plan')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Get()
  @ApiOperation({ summary: 'List all plans' })
  findAll() {
    return this.planService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get plan by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.planService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Create plan (admin)' })
  create(@Body() dto: CreatePlanDto) {
    return this.planService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Update plan (admin)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePlanDto) {
    return this.planService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Delete plan (admin)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.planService.remove(id);
  }
}
