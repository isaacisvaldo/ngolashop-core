import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateReportDto {
  @ApiProperty({ enum: ['store', 'product', 'review', 'client'] })
  @IsIn(['store', 'product', 'review', 'client'])
  targetType!: 'store' | 'product' | 'review' | 'client';

  @ApiProperty({ example: 1 })
  @IsInt()
  targetId!: number;

  @ApiProperty({ example: 'Produto falsificado' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  reason!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  details?: string;

  @ApiPropertyOptional({ example: 'João Manuel' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  reporterName?: string;

  @ApiPropertyOptional({ example: 'joao@email.ao' })
  @IsOptional()
  @IsEmail()
  reporterEmail?: string;
}

export class UpdateReportDto {
  @ApiProperty({ enum: ['open', 'in_review', 'resolved', 'dismissed'] })
  @IsIn(['open', 'in_review', 'resolved', 'dismissed'])
  status!: 'open' | 'in_review' | 'resolved' | 'dismissed';
}
