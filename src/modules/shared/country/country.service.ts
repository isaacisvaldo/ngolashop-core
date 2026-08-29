import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Country } from './entities/country.entity';

@Injectable()
export class CountryService {
  constructor(
    @InjectRepository(Country)
    private readonly countryRepository: Repository<Country>,
  ) {}

  async findAll() {
    return this.countryRepository.find({ order: { name: 'ASC' } });
  }

  async findOne(id: number) {
    const country = await this.countryRepository.findOne({ where: { id } });
    if (!country) throw new NotFoundException(`Country #${id} not found`);
    return country;
  }
}
