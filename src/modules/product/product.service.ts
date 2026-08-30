import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
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
    const slug = this.slugify(createProductDto.name);
    const product = this.productRepo.create({
      ...createProductDto,
      storeId,
      slug,
    });
    return this.productRepo.save(product);
  }

  async findAll(
    page = 1,
    limit = 10,
    storeId?: number,
    categoryId?: number,
  ) {
    const qb = this.productRepo.createQueryBuilder('product');

    if (storeId) {
      qb.andWhere('product.storeId = :storeId', { storeId });
    }
    if (categoryId) {
      qb.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('product.createdAt', 'DESC')
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: { images: true },
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
    if (product.storeId !== storeId) {
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
    if (product.storeId !== storeId) {
      throw new ForbiddenException('You can only remove your own products');
    }
    return this.productRepo.remove(product);
  }

  async addImage(
    productId: number,
    createImageDto: CreateProductImageDto,
    storeId: number,
  ) {
    const product = await this.findOne(productId);
    if (product.storeId !== storeId) {
      throw new ForbiddenException(
        'You can only add images to your own products',
      );
    }

    const image = this.imageRepo.create({
      ...createImageDto,
      productId,
    });
    return this.imageRepo.save(image);
  }

  async removeImage(productId: number, imageId: number, storeId: number) {
    const product = await this.findOne(productId);
    if (product.storeId !== storeId) {
      throw new ForbiddenException(
        'You can only remove images from your own products',
      );
    }

    const image = await this.imageRepo.findOne({
      where: { id: imageId, productId },
    });
    if (!image) {
      throw new NotFoundException(
        `Image #${imageId} not found for product #${productId}`,
      );
    }
    return this.imageRepo.remove(image);
  }
}
