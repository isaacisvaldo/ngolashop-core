import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { AuthModule } from '../shared/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductImage]), AuthModule],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
