import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Setting } from './entities/setting.entity';

@Injectable()
export class SettingService {
  constructor(
    @InjectRepository(Setting)
    private readonly settingRepository: Repository<Setting>,
  ) {}

  findAll() {
    return this.settingRepository.find({ order: { key: 'ASC' } });
  }

  async findPublic() {
    const rows = await this.settingRepository.find({ where: { isPublic: true } });
    return Object.fromEntries(rows.map((r) => [r.key, this.parse(r)]));
  }

  async getNumber(key: string, fallback: number) {
    const row = await this.settingRepository.findOne({ where: { key } });
    const value = row ? Number(row.value) : NaN;
    return Number.isFinite(value) ? value : fallback;
  }

  async getBoolean(key: string, fallback = false) {
    const row = await this.settingRepository.findOne({ where: { key } });
    return row ? row.value === 'true' : fallback;
  }

  async updateMany(values: Record<string, string | number | boolean>) {
    const keys = Object.keys(values);
    const rows = await this.settingRepository.find({ where: { key: In(keys) } });
    if (rows.length !== keys.length) {
      const known = new Set(rows.map((r) => r.key));
      throw new BadRequestException(`Configuração desconhecida: ${keys.filter((k) => !known.has(k)).join(', ')}`);
    }
    for (const row of rows) {
      const raw = values[row.key];
      if (row.type === 'number' && !Number.isFinite(Number(raw))) {
        throw new BadRequestException(`"${row.label}" tem de ser numérico`);
      }
      if (row.type === 'boolean') {
        row.value = String(raw === true || raw === 'true');
      } else {
        row.value = String(raw).trim();
      }
    }
    await this.settingRepository.save(rows);
    return this.findAll();
  }

  private parse(row: Setting) {
    if (row.type === 'number') return Number(row.value);
    if (row.type === 'boolean') return row.value === 'true';
    return row.value;
  }
}
