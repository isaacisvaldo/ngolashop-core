import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDisputeDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  orderId!: number;

  @ApiProperty({ example: 'Produto não corresponde à descrição' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  reason!: string;

  @ApiPropertyOptional({ example: 'Recebi a cor errada e a loja não responde.' })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  description?: string;
}

export class UpdateDisputeDto {
  @ApiProperty({ enum: ['open', 'in_review', 'resolved', 'rejected'] })
  @IsIn(['open', 'in_review', 'resolved', 'rejected'])
  status!: 'open' | 'in_review' | 'resolved' | 'rejected';

  @ApiPropertyOptional({ example: 'Reembolso total aprovado.' })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  resolution?: string;
}
