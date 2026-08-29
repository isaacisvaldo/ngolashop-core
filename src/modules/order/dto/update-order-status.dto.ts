import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, example: OrderStatus.CONFIRMED })
  @IsEnum(OrderStatus)
  @IsNotEmpty()
  status!: OrderStatus;

  @ApiPropertyOptional({ example: 'Pedido confirmado com sucesso' })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional({ example: 'TRACK123456' })
  @IsString()
  @IsOptional()
  trackingCode?: string;
}
