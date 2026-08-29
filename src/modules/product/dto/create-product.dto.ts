import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @IsNotEmpty()
  price!: number;

  @IsOptional()
  @IsNumber()
  compareAtPrice?: number;

  @IsNumber()
  stockQuantity: number = 0;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @IsBoolean()
  isFeatured: boolean = false;
}
