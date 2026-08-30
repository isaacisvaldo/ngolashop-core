import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminUser } from './entities/admin-user.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly adminUserRepository: Repository<AdminUser>,
  ) {}

  async findById(id: number) {
    return this.adminUserRepository.findOne({ where: { id } });
  }

  async isActive(id: number) {
    const user = await this.adminUserRepository.findOne({ where: { id } });
    return user?.isActive ?? false;
  }

  async hasRole(id: number) {
    const user = await this.adminUserRepository.findOne({ where: { id } });
    return user?.roleId != null;
  }
}
