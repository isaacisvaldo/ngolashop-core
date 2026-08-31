import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class OrderItemDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  productId!: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  storeId!: number;

  @ApiPropertyOptional({ description: 'Client ID (auto-filled if logged in)' })
  @IsNumber()
  @IsOptional()
  clientId?: number;

  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @IsNotEmpty()
  customerName!: string;

  @ApiPropertyOptional({ example: 'joao@email.com' })
  @IsEmail()
  @IsOptional()
  customerEmail?: string;

  @ApiProperty({ example: '923123456' })
  @IsString()
  @IsNotEmpty()
  customerPhone!: string;

  @ApiPropertyOptional({ example: 'Rua das Flores, 123 - Luanda' })
  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @ApiPropertyOptional({ example: 'Entregar antes das 18h' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}
