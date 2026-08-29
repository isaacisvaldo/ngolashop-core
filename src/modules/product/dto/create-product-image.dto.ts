import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateProductImageDto {
  @ApiProperty({ example: 'https://example.com/product.jpg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  url!: string;

  @ApiPropertyOptional({ example: 'T-Shirt Nike de frente' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  altText?: string;

  @ApiProperty({ example: 0 })
  @IsNumber()
  position: number = 0;
}
