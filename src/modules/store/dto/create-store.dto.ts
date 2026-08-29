import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStoreDto {
  @ApiProperty({ example: 'Minha Loja' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ example: 'minha-loja' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  slug!: string;

  @ApiProperty({ example: '923123456' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  whatsapp!: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'https://example.com/banner.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  bannerUrl?: string;

  @ApiPropertyOptional({ example: 'A melhor loja de Angola' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '#FF5722' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  primaryColor?: string;
}
