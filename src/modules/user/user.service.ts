import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../shared/auth/entities/user.entity';
import { Store } from '../store/entities/store.entity';
import { StoreSubscription } from '../subscription/entities/subscription.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
    @InjectRepository(StoreSubscription)
    private readonly subscriptionRepository: Repository<StoreSubscription>,
  ) {}

  async create(storeId: number, createUserDto: CreateUserDto): Promise<User> {
    const existingEmail = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });
    if (existingEmail) {
      throw new BadRequestException('A user with this email already exists');
    }

    const store = await this.storeRepository.findOne({
      where: { id: storeId },
    });
    if (!store) {
      throw new NotFoundException('Store not found');
    }

    // Check user limit from active subscription
    const subscription = await this.subscriptionRepository.findOne({
      where: { storeId, status: 'active' },
      relations: { plan: true },
      order: { createdAt: 'DESC' },
    });

    if (subscription?.plan && subscription.plan.limitUsers !== null) {
      const currentUserCount = await this.userRepository.count({
        where: { storeId },
      });
      if (currentUserCount >= subscription.plan.limitUsers) {
        throw new ForbiddenException(
          'User limit reached for your current plan',
        );
      }
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
      storeId,
    });
    return this.userRepository.save(user);
  }

  async findAll(storeId: number, page = 1, limit = 10) {
    const [data, total] = await this.userRepository.findAndCount({
      where: { storeId },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        rootAdmin: true,
        createdAt: true,
      },
    });

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number, storeId: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, storeId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        rootAdmin: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async update(
    id: number,
    storeId: number,
    updateUserDto: UpdateUserDto,
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id, storeId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingEmail = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (existingEmail) {
        throw new BadRequestException('A user with this email already exists');
      }
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async remove(id: number, storeId: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id, storeId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    if (user.rootAdmin) {
      throw new ForbiddenException('Cannot delete root admin user');
    }
    await this.userRepository.softRemove(user);
  }
}
