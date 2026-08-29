import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProvinceService } from './province.service';

@ApiTags('Provinces')
@Controller('province')
export class ProvinceController {
  constructor(private readonly provinceService: ProvinceService) {}

  @Get()
  @ApiOperation({ summary: 'List provinces (optionally filter by country)' })
  @ApiQuery({ name: 'countryId', required: false, type: Number })
  findAll(@Query('countryId') countryId?: string) {
    return this.provinceService.findAll(countryId ? +countryId : undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get province by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.provinceService.findOne(id);
  }
}
