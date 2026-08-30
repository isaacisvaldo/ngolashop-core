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
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { ProductFilterDto } from './dto/product-filter.dto';
import { JwtAuthGuard } from '../shared/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../shared/auth/guards/admin.guard';
import { CurrentUser } from '../shared/auth/decorators/current-user.decorator';

@ApiTags('Products')
@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create product' })
  create(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser('storeId') storeId: number,
  ) {
    return this.productService.create(createProductDto, storeId);
  }

  @Get()
  @ApiOperation({ summary: 'List products' })
  findAll(@Query() query: ProductFilterDto) {
    return this.productService.findAll(
      query.page,
      query.limit,
      query.storeId,
      query.categoryId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update product' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser('storeId') storeId: number,
  ) {
    return this.productService.update(id, updateProductDto, storeId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete product' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('storeId') storeId: number,
  ) {
    return this.productService.remove(id, storeId);
  }

  @Post(':id/images')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Add product image' })
  addImage(
    @Param('id', ParseIntPipe) id: number,
    @Body() createImageDto: CreateProductImageDto,
    @CurrentUser('storeId') storeId: number,
  ) {
    return this.productService.addImage(id, createImageDto, storeId);
  }

  @Delete(':id/images/:imageId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remove product image' })
  removeImage(
    @Param('id', ParseIntPipe) id: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @CurrentUser('storeId') storeId: number,
  ) {
    return this.productService.removeImage(id, imageId, storeId);
  }

  @Patch(':id/admin')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Admin update product (publish/feature/activate)' })
  adminUpdate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productService.adminUpdate(id, dto);
  }
}
