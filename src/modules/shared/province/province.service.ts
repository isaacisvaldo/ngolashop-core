import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Province } from './entities/province.entity';

@Injectable()
export class ProvinceService {
  constructor(
    @InjectRepository(Province)
    private readonly provinceRepository: Repository<Province>,
  ) {}

  async findAll(countryId?: number) {
    const where: { countryId?: number } = {};
    if (countryId) where.countryId = countryId;
    return this.provinceRepository.find({
      where,
      relations: { country: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number) {
    const province = await this.provinceRepository.findOne({
      where: { id },
      relations: { country: true },
    });
    if (!province) throw new NotFoundException(`Province #${id} not found`);
    return province;
  }
}
