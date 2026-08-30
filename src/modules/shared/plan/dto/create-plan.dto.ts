import { IsString, IsOptional, IsNumber, IsBoolean, MaxLength, Min } from 'class-validator';

export class CreatePlanDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsNumber()
  @IsOptional()
  priceQuarterly?: number | null;

  @IsNumber()
  @IsOptional()
  priceAnnual?: number | null;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  position?: number;

  @IsNumber()
  @IsOptional()
  limitProducts?: number | null;

  @IsNumber()
  @IsOptional()
  limitImagesPerProduct?: number | null;

  @IsNumber()
  @IsOptional()
  limitOrdersPerMonth?: number | null;

  @IsNumber()
  @IsOptional()
  limitUsers?: number | null;

  @IsBoolean()
  @IsOptional()
  allowsCustomDomain?: boolean;

  @IsBoolean()
  @IsOptional()
  allowsAdvancedStatistics?: boolean;

  @IsBoolean()
  @IsOptional()
  allowsChatbot?: boolean;

  @IsBoolean()
  @IsOptional()
  hasPrioritySupport?: boolean;
}
