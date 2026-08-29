import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProvinceService } from './province.service';
import { ProvinceController } from './province.controller';
import { Province } from './entities/province.entity';
import { Country } from '../country/entities/country.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Province, Country])],
  controllers: [ProvinceController],
  providers: [ProvinceService],
  exports: [ProvinceService],
})
export class ProvinceModule {}
