import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { BillingService } from '../billing/billing.service';
import { ProductImage } from './entities/product-image.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductImageDto } from './dto/create-product-image.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly imageRepo: Repository<ProductImage>,
    private readonly billing: BillingService,
  ) {}

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  async create(createProductDto: CreateProductDto, storeId: number) {
    await this.billing.assertCanCreateProduct(storeId);
    const slug = this.slugify(createProductDto.name);
    const product = this.productRepo.create({
      ...createProductDto,
      store: { id: storeId },
      slug,
    });
    return this.productRepo.save(product);
  }

  async findAll(
    page = 1,
    limit = 10,
    storeId?: number,
    categoryId?: number,
    search?: string,
    published?: boolean,
    sort: 'recent' | 'price_asc' | 'price_desc' | 'rating' | 'sales' = 'recent',
  ) {
    const qb = this.productRepo
      .createQueryBuilder('product')
      .leftJoin('product.store', 'store')
      .addSelect(['store.id', 'store.name', 'store.slug', 'store.logoUrl', 'store.isVerified', 'store.averageRating'])
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect('product.category', 'category');

    if (storeId) {
      qb.andWhere('product.store_id = :storeId', { storeId });
    }
    if (categoryId) {
      qb.andWhere('product.category_id = :categoryId', { categoryId });
    }
    if (search) {
      qb.andWhere('(product.name ILIKE :s OR product.description ILIKE :s OR store.name ILIKE :s)', { s: `%${search}%` });
    }
    if (published) {
      qb.andWhere('product.isActive = true AND product.isPublished = true AND product.hiddenByPlan = false')
        .andWhere('store.isActive = true AND store.isPublished = true');
    }

    const order: Record<string, [string, 'ASC' | 'DESC']> = {
      recent: ['product.createdAt', 'DESC'],
      price_asc: ['product.price', 'ASC'],
      price_desc: ['product.price', 'DESC'],
      rating: ['product.averageRating', 'DESC'],
      sales: ['product.totalSales', 'DESC'],
    };
    const [data, total] = await qb
      .orderBy(...order[sort])
      .addOrderBy('images.position', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const counts = data.length
      ? await this.productRepo.manager.query(
          `SELECT product_id AS id, COUNT(*) AS n FROM tb_reviews
            WHERE status = 'approved' AND deleted_at IS NULL AND product_id = ANY($1) GROUP BY product_id`,
          [data.map((p) => p.id)],
        ) as { id: number; n: string }[]
      : [];
    const countMap = new Map(counts.map((c) => [Number(c.id), Number(c.n)]));

    return {
      data: data.map((p) => Object.assign(p, { reviewCount: countMap.get(p.id) ?? 0 })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /** Detalhe público: esconde funcionalidades que o plano da loja não inclui. */
  async findPublic(id: number) {
    const product = await this.findOne(id);
    if (product.store) {
      const plan = await this.billing.features(product.storeId);
      const { isFounder: _f, founderSince: _fs, commissionPercentage: _c, ...store } = product.store;
      return {
        ...product,
        store: {
          ...store,
          chatbot: plan.allowsChatbot ? product.store.chatbot : null,
          showBranding: !(plan.allowsRemoveBranding && product.store.hideBranding),
        },
        maxImages: plan.limitImagesPerProduct,
      };
    }
    return product;
  }

  async findOne(id: number) {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: { images: true, store: true, category: true },
      order: { images: { position: 'ASC' } },
    });
    if (!product) {
      throw new NotFoundException(`Product #${id} not found`);
    }
    return product;
  }

  async update(
    id: number,
    updateProductDto: UpdateProductDto,
    storeId: number,
  ) {
    const product = await this.findOne(id);
    if (product.store?.id !== storeId) {
      throw new ForbiddenException('You can only update your own products');
    }

    if (updateProductDto.name) {
      product.slug = this.slugify(updateProductDto.name);
    }

    Object.assign(product, updateProductDto);
    return this.productRepo.save(product);
  }

  async remove(id: number, storeId: number) {
    const product = await this.findOne(id);
    if (product.store?.id !== storeId) {
      throw new ForbiddenException('You can only remove your own products');
    }
    const removed = await this.productRepo.remove(product);
    // Com um produto a menos, um produto oculto pelo limite do plano pode voltar a aparecer
    await this.billing.syncStore(storeId);
    return removed;
  }

  async addImage(
    productId: number,
    createImageDto: CreateProductImageDto,
    storeId: number,
  ) {
    const product = await this.findOne(productId);
    if (product.store?.id !== storeId) {
      throw new ForbiddenException(
        'You can only add images to your own products',
      );
    }

    const currentCount = await this.imageRepo.count({
      where: { product: { id: productId } },
    });
    await this.billing.assertCanAddImage(storeId, currentCount);

    const image = this.imageRepo.create({
      ...createImageDto,
      product: { id: productId },
    });
    return this.imageRepo.save(image);
  }

  async removeImage(productId: number, imageId: number, storeId: number) {
    const product = await this.findOne(productId);
    if (product.store?.id !== storeId) {
      throw new ForbiddenException(
        'You can only remove images from your own products',
      );
    }

    const image = await this.imageRepo.findOne({
      where: { id: imageId, product: { id: productId } },
    });
    if (!image) {
      throw new NotFoundException(
        `Image #${imageId} not found for product #${productId}`,
      );
    }
    return this.imageRepo.remove(image);
  }

  async adminUpdate(id: number, dto: UpdateProductDto) {
    const product = await this.findOne(id);
    if (dto.name) {
      product.slug = this.slugify(dto.name);
    }
    Object.assign(product, dto);
    return this.productRepo.save(product);
  }
}
