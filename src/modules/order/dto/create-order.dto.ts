import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsIn,
  ArrayMinSize,
  MaxLength,
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

  @ApiPropertyOptional({ enum: ['delivery', 'pickup'], default: 'delivery' })
  @IsOptional()
  @IsIn(['delivery', 'pickup'])
  deliveryType?: 'delivery' | 'pickup';

  @ApiPropertyOptional({ example: 'zona-1', description: 'ID da zona de entrega configurada pela loja' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  deliveryZoneId?: string;

  @ApiPropertyOptional({ enum: ['multicaixa', 'transferencia', 'entrega'] })
  @IsOptional()
  @IsIn(['multicaixa', 'transferencia', 'entrega'])
  paymentMethod?: 'multicaixa' | 'transferencia' | 'entrega';

  @ApiPropertyOptional({ example: 'Luanda' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  customerProvince?: string;

  @ApiPropertyOptional({ example: 'Talatona' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  customerCity?: string;

  @ApiPropertyOptional({ example: 'BEMVINDO10' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  couponCode?: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}
