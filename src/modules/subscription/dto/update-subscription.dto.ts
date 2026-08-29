import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsNumber, IsString } from 'class-validator';

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  planId?: number;

  @ApiPropertyOptional({ example: '2027-01-01' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: ['active', 'expired', 'cancelled'] })
  @IsOptional()
  @IsString()
  status?: string;
}
