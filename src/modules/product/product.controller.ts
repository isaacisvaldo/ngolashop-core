import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { JwtAuthGuard } from '../shared/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../shared/auth/decorators/current-user.decorator';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser('storeId') storeId: number,
  ) {
    return this.productService.create(createProductDto, storeId);
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('storeId') storeId?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.productService.findAll(
      page ? +page : 1,
      limit ? +limit : 10,
      storeId ? +storeId : undefined,
      categoryId ? +categoryId : undefined,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser('storeId') storeId: number,
  ) {
    return this.productService.update(id, updateProductDto, storeId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('storeId') storeId: number,
  ) {
    return this.productService.remove(id, storeId);
  }

  @Post(':id/images')
  @UseGuards(JwtAuthGuard)
  addImage(
    @Param('id', ParseIntPipe) id: number,
    @Body() createImageDto: CreateProductImageDto,
    @CurrentUser('storeId') storeId: number,
  ) {
    return this.productService.addImage(id, createImageDto, storeId);
  }

  @Delete(':id/images/:imageId')
  @UseGuards(JwtAuthGuard)
  removeImage(
    @Param('id', ParseIntPipe) id: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @CurrentUser('storeId') storeId: number,
  ) {
    return this.productService.removeImage(id, imageId, storeId);
  }
}
