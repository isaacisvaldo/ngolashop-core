import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from './entities/favorite.entity';
import { Product } from '../product/entities/product.entity';

@Injectable()
export class FavoriteService {
  constructor(
    @InjectRepository(Favorite) private readonly favoriteRepository: Repository<Favorite>,
    @InjectRepository(Product) private readonly productRepository: Repository<Product>,
  ) {}

  findAll(clientId: number) {
    return this.favoriteRepository
      .createQueryBuilder('f')
      .innerJoinAndSelect('f.product', 'product')
      .leftJoinAndSelect('product.images', 'images')
      .leftJoin('product.store', 'store')
      .addSelect(['store.id', 'store.name', 'store.slug'])
      .where('f.client_id = :clientId', { clientId })
      .orderBy('f.createdAt', 'DESC')
      .getMany();
  }

  async ids(clientId: number) {
    const rows = await this.favoriteRepository.find({ where: { clientId }, select: { productId: true } });
    return rows.map((r) => r.productId);
  }

  async add(clientId: number, productId: number) {
    const product = await this.productRepository.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Produto não encontrado');
    await this.favoriteRepository
      .createQueryBuilder()
      .insert()
      .values({ clientId, productId })
      .orIgnore()
      .execute();
    return { productId, favorite: true };
  }

  async remove(clientId: number, productId: number) {
    await this.favoriteRepository.delete({ clientId, productId });
    return { productId, favorite: false };
  }
}
