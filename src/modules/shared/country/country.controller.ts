import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CountryService } from './country.service';

@ApiTags('Countries')
@Controller('country')
export class CountryController {
  constructor(private readonly countryService: CountryService) {}

  @Get()
  @ApiOperation({ summary: 'List all countries' })
  findAll() {
    return this.countryService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get country by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.countryService.findOne(id);
  }
}
