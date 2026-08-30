import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'T-Shirt Nike' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: 'T-Shirt preta de algodão' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 15000 })
  @IsNumber()
  @IsNotEmpty()
  price!: number;

  @ApiPropertyOptional({ example: 20000 })
  @IsOptional()
  @IsNumber()
  compareAtPrice?: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  stockQuantity: number = 0;

  @ApiPropertyOptional({ example: 'NIKE-TSHIRT-BLK-001' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  isFeatured: boolean = false;

  @ApiProperty({ example: false })
  @IsBoolean()
  isPublished: boolean = false;
}
