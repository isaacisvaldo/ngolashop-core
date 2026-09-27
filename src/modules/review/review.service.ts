import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/review.dto';
import { Product } from '../product/entities/product.entity';
import { Store } from '../store/entities/store.entity';
import { Client } from '../client/entities/client.entity';
import { Order } from '../order/entities/order.entity';
import { SettingService } from '../setting/setting.service';
import { paginate } from '../../common/require-user-type';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review) private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Product) private readonly productRepository: Repository<Product>,
    @InjectRepository(Store) private readonly storeRepository: Repository<Store>,
    @InjectRepository(Client) private readonly clientRepository: Repository<Client>,
    @InjectRepository(Order) private readonly orderRepository: Repository<Order>,
    private readonly settingService: SettingService,
  ) {}

  async create(clientId: number, dto: CreateReviewDto) {
    const client = await this.clientRepository.findOne({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Cliente não encontrado');

    let storeId = dto.storeId;
    if (dto.productId) {
      const product = await this.productRepository.findOne({ where: { id: dto.productId } });
      if (!product) throw new NotFoundException('Produto não encontrado');
      storeId = product.storeId;
    }
    if (!storeId) throw new BadRequestException('Indique o produto ou a loja a avaliar');

    // Só quem comprou (pedido entregue) pode avaliar
    const qb = this.orderRepository
      .createQueryBuilder('o')
      .where('o.client_id = :clientId', { clientId })
      .andWhere('o.store_id = :storeId', { storeId })
      .andWhere('o.status = :status', { status: 'delivered' });
    if (dto.productId) {
      qb.innerJoin('o.items', 'i', 'i.product_id = :productId', { productId: dto.productId });
    }
    const order = await qb.orderBy('o.createdAt', 'DESC').getOne();
    if (!order) {
      throw new ForbiddenException('Só pode avaliar produtos ou lojas de pedidos já entregues');
    }

    const duplicate = await this.reviewRepository.findOne({
      where: { clientId, storeId, productId: dto.productId ?? IsNull() },
    });
    if (duplicate) {
      throw new BadRequestException('Já avaliou este item');
    }

    const autoApprove = await this.settingService.getBoolean('auto_approve_reviews');
    const review = await this.reviewRepository.save(
      this.reviewRepository.create({
        storeId,
        productId: dto.productId ?? null,
        clientId,
        orderId: order.id,
        authorName: client.name,
        rating: dto.rating,
        comment: dto.comment?.trim() || null,
        status: autoApprove ? 'approved' : 'pending',
      }),
    );
    if (autoApprove) await this.recalculate(review);
    return review;
  }

  async findPublic(filter: { productId?: number; storeId?: number }, page = 1, limit = 10) {
    const qb = this.reviewRepository
      .createQueryBuilder('r')
      .where('r.status = :status', { status: 'approved' })
      .orderBy('r.createdAt', 'DESC');
    if (filter.productId) qb.andWhere('r.product_id = :p', { p: filter.productId });
    if (filter.storeId) qb.andWhere('r.store_id = :s', { s: filter.storeId });

    const summary = await qb
      .clone()
      .select('COALESCE(AVG(r.rating), 0)', 'average')
      .addSelect('COUNT(*)', 'count')
      .orderBy()
      .getRawOne<{ average: string; count: string }>();

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return {
      ...paginate(
        data.map(({ clientId: _c, orderId: _o, ...r }) => r),
        total,
        page,
        limit,
      ),
      summary: { average: Number(Number(summary?.average ?? 0).toFixed(2)), count: Number(summary?.count ?? 0) },
    };
  }

  findByClient(clientId: number) {
    return this.reviewRepository.find({
      where: { clientId },
      relations: { product: true, store: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findAdmin(page = 1, limit = 20, status?: string, search?: string) {
    const qb = this.reviewRepository
      .createQueryBuilder('r')
      .leftJoin('r.product', 'product')
      .addSelect(['product.id', 'product.name'])
      .leftJoin('r.store', 'store')
      .addSelect(['store.id', 'store.name', 'store.slug'])
      .orderBy('r.createdAt', 'DESC');
    if (status) qb.andWhere('r.status = :status', { status });
    if (search) {
      qb.andWhere('(r.authorName ILIKE :s OR r.comment ILIKE :s OR product.name ILIKE :s OR store.name ILIKE :s)', {
        s: `%${search}%`,
      });
    }
    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    const counts = await this.reviewRepository
      .createQueryBuilder('r')
      .select('r.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('r.status')
      .getRawMany<{ status: string; count: string }>();
    return {
      ...paginate(data, total, page, limit),
      counts: Object.fromEntries(counts.map((c) => [c.status, Number(c.count)])),
    };
  }

  async updateStatus(id: number, status: Review['status']) {
    const review = await this.reviewRepository.findOne({ where: { id } });
    if (!review) throw new NotFoundException(`Avaliação #${id} não encontrada`);
    review.status = status;
    await this.reviewRepository.save(review);
    await this.recalculate(review);
    return review;
  }

  async remove(id: number) {
    const review = await this.reviewRepository.findOne({ where: { id } });
    if (!review) throw new NotFoundException(`Avaliação #${id} não encontrada`);
    await this.reviewRepository.softRemove(review);
    await this.recalculate(review);
    return { message: 'Avaliação removida' };
  }

  /** Recalcula a média do produto e da loja com base nas avaliações aprovadas. */
  private async recalculate(review: Review) {
    const avg = async (column: 'product_id' | 'store_id', id: number) => {
      const row = await this.reviewRepository
        .createQueryBuilder('r')
        .select('COALESCE(AVG(r.rating), 0)', 'avg')
        .where(`r.${column} = :id`, { id })
        .andWhere('r.status = :status', { status: 'approved' })
        .getRawOne<{ avg: string }>();
      return Number(Number(row?.avg ?? 0).toFixed(2));
    };
    if (review.productId) {
      await this.productRepository.update(review.productId, { averageRating: await avg('product_id', review.productId) });
    }
    await this.storeRepository.update(review.storeId, { averageRating: await avg('store_id', review.storeId) });
  }
}
