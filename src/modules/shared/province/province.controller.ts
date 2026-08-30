import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProvinceService } from './province.service';
import { ProvinceFilterDto } from './dto/province-filter.dto';

@ApiTags('Provinces')
@Controller('province')
export class ProvinceController {
  constructor(private readonly provinceService: ProvinceService) {}

  @Get()
  @ApiOperation({ summary: 'List provinces (optionally filter by country)' })
  findAll(@Query() query: ProvinceFilterDto) {
    return this.provinceService.findAll(query.countryId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get province by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.provinceService.findOne(id);
  }
}
