import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from './entities/store.entity';
import { CreateStoreDto } from './dto/create-store.dto';
import { AdminUpdateStoreDto, UpdateStoreDto } from './dto/update-store.dto';
import { BillingService } from '../billing/billing.service';

@Injectable()
export class StoreService {
  constructor(
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
    private readonly billing: BillingService,
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
    search?: string,
    published?: boolean,
  ): Promise<{
    data: Store[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const qb = this.storeRepository
      .createQueryBuilder('store')
      .leftJoinAndSelect('store.category', 'category')
      .orderBy('store.createdAt', 'DESC');
    if (search) {
      qb.andWhere('(store.name ILIKE :s OR store.slug ILIKE :s OR store.description ILIKE :s)', { s: `%${search}%` });
    }
    if (published) {
      qb.andWhere('store.isActive = true AND store.isPublished = true');
    }
    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();

    const counts = data.length
      ? await this.storeRepository.manager.query(
          `SELECT store_id AS id, COUNT(*) AS n FROM tb_reviews
            WHERE status = 'approved' AND deleted_at IS NULL AND store_id = ANY($1) GROUP BY store_id`,
          [data.map((s) => s.id)],
        ) as { id: number; n: string }[]
      : [];
    const countMap = new Map(counts.map((c) => [Number(c.id), Number(c.n)]));

    return {
      data: data.map((s) => Object.assign(s, { reviewCount: countMap.get(s.id) ?? 0 })),
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

  /** Vista pública: respeita as funcionalidades do plano (chatbot, marca, domínio). */
  async findBySlug(slug: string) {
    const store = await this.storeRepository.findOne({
      where: { slug },
      relations: { category: true },
    });
    if (!store) {
      throw new NotFoundException(`Store with slug "${slug}" not found`);
    }
    const plan = await this.billing.features(store.id);
    const { isFounder: _f, founderSince: _fs, commissionPercentage: _c, ...rest } = store;
    return {
      ...rest,
      chatbot: plan.allowsChatbot ? store.chatbot : null,
      showBranding: !(plan.allowsRemoveBranding && store.hideBranding),
      customDomain: plan.allowsCustomDomain ? store.customDomain : null,
    };
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

    // Funcionalidades pagas: só é possível ativá-las com o plano adequado
    if (updateStoreDto.chatbot && (updateStoreDto.chatbot.faq?.length || updateStoreDto.chatbot.boasVindas)) {
      await this.billing.assertFeature(id, 'allowsChatbot', 'O chatbot da loja');
    }
    if (updateStoreDto.hideBranding) {
      await this.billing.assertFeature(id, 'allowsRemoveBranding', 'Remover a marca Kamba Shop');
    }
    if (updateStoreDto.customDomain) {
      await this.billing.assertFeature(id, 'allowsCustomDomain', 'O domínio próprio');
      updateStoreDto.customDomain = updateStoreDto.customDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(updateStoreDto.customDomain)) {
        throw new BadRequestException('Domínio inválido (ex.: loja.marca.ao)');
      }
    }

    Object.assign(store, updateStoreDto);
    await this.storeRepository.save(store);
    return this.storeRepository.findOne({ where: { id } }) as Promise<Store>;
  }

  async adminUpdate(id: number, dto: AdminUpdateStoreDto): Promise<Store> {
    const store = await this.storeRepository.findOne({ where: { id } });
    if (!store) {
      throw new NotFoundException(`Store with ID ${id} not found`);
    }
    if (dto.slug && dto.slug !== store.slug) {
      const existingSlug = await this.storeRepository.findOne({ where: { slug: dto.slug } });
      if (existingSlug) throw new ConflictException('A store with this slug already exists');
    }
    Object.assign(store, dto);
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
