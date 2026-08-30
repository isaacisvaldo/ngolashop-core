import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from './entities/store.entity';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

@Injectable()
export class StoreService {
  constructor(
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
  ) {}

  async create(createStoreDto: CreateStoreDto): Promise<Store> {
    const existingSlug = await this.storeRepository.findOne({
      where: { slug: createStoreDto.slug },
    });
    if (existingSlug) {
      throw new ConflictException('A store with this slug already exists');
    }

    const store = this.storeRepository.create(createStoreDto);
    return this.storeRepository.save(store);
  }

  async findAll(
    page = 1,
    limit = 10,
  ): Promise<{
    data: Store[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const [data, total] = await this.storeRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number): Promise<Store> {
    const store = await this.storeRepository.findOne({ where: { id } });
    if (!store) {
      throw new NotFoundException(`Store with ID ${id} not found`);
    }
    return store;
  }

  async findBySlug(slug: string): Promise<Store> {
    const store = await this.storeRepository.findOne({
      where: { slug },
      relations: { category: true, products: true },
    });
    if (!store) {
      throw new NotFoundException(`Store with slug "${slug}" not found`);
    }
    return store;
  }

  async update(
    id: number,
    updateStoreDto: UpdateStoreDto,
    storeId: number,
  ): Promise<Store> {
    if (id !== storeId) {
      throw new ForbiddenException('You can only update your own store');
    }

    const store = await this.storeRepository.findOne({ where: { id } });
    if (!store) {
      throw new NotFoundException(`Store with ID ${id} not found`);
    }

    if (updateStoreDto.slug && updateStoreDto.slug !== store.slug) {
      const existingSlug = await this.storeRepository.findOne({
        where: { slug: updateStoreDto.slug },
      });
      if (existingSlug) {
        throw new ConflictException('A store with this slug already exists');
      }
    }

    Object.assign(store, updateStoreDto);
    await this.storeRepository.save(store);
    return this.storeRepository.findOne({ where: { id } }) as Promise<Store>;
  }

  async remove(id: number): Promise<void> {
    const store = await this.storeRepository.findOne({ where: { id } });
    if (!store) {
      throw new NotFoundException(`Store with ID ${id} not found`);
    }
    await this.storeRepository.softRemove(store);
  }
}
