import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {}

  async findAll(page = 1, limit = 10) {
    const [data, total] = await this.clientRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
      select: {
        id: true, name: true, email: true, phone: true,
        province: true, city: true, isActive: true, createdAt: true,
      },
    });
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: number) {
    const client = await this.clientRepository.findOne({ where: { id } });
    if (!client) throw new NotFoundException(`Client #${id} not found`);
    const { password: _, refreshToken: __, ...result } = client as any;
    return result;
  }

  async update(id: number, dto: UpdateClientDto) {
    const client = await this.clientRepository.findOne({ where: { id } });
    if (!client) throw new NotFoundException(`Client #${id} not found`);
    Object.assign(client, dto);
    const saved = await this.clientRepository.save(client);
    const { password: _, refreshToken: __, ...result } = saved as any;
    return result;
  }

  async remove(id: number) {
    const client = await this.clientRepository.findOne({ where: { id } });
    if (!client) throw new NotFoundException(`Client #${id} not found`);
    await this.clientRepository.softRemove(client);
    return { message: `Client #${id} removido com sucesso` };
  }
}
