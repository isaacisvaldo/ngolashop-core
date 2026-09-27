import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateReviewDto {
  @ApiPropertyOptional({ example: 1, description: 'Produto avaliado (omitir para avaliar só a loja)' })
  @IsOptional()
  @IsInt()
  productId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Obrigatório quando não há productId' })
  @IsOptional()
  @IsInt()
  storeId?: number;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ example: 'Produto excelente, entrega rápida.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

export class UpdateReviewStatusDto {
  @ApiProperty({ enum: ['pending', 'approved', 'rejected'] })
  @IsIn(['pending', 'approved', 'rejected'])
  status!: 'pending' | 'approved' | 'rejected';
}
