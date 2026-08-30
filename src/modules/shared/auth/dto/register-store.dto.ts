import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterStoreDto {
  @ApiProperty({ example: 'Minha Loja' })
  @IsString()
  @IsNotEmpty()
  storeName!: string;

  @ApiProperty({ example: 'joao@email.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: '923123456' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiPropertyOptional({ example: 1, description: 'Plan ID. If not provided, defaults to free plan' })
  @IsOptional()
  @IsInt()
  planId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Category ID for the business' })
  @IsOptional()
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png', description: 'Store logo URL' })
  @IsOptional()
  @IsString()
  logoUrl?: string;
}
