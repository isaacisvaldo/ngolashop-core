import { IsString, IsOptional, IsNumber, IsBoolean, MaxLength, Min, IsInt, IsIn, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PlanFeatureTextDto {
  @IsString()
  @MaxLength(255)
  text!: string;

  @IsBoolean()
  included!: boolean;
}

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

  @IsInt()
  @Min(0)
  @IsOptional()
  limitHighlightsPerMonth?: number;

  @IsBoolean()
  @IsOptional()
  allowsCoupons?: boolean;

  @IsBoolean()
  @IsOptional()
  allowsRemoveBranding?: boolean;

  @IsIn(['basic', 'sales', 'advanced', 'advanced_export'])
  @IsOptional()
  statisticsLevel?: 'basic' | 'sales' | 'advanced' | 'advanced_export';

  @IsIn(['email', 'whatsapp', 'dedicated'])
  @IsOptional()
  supportLevel?: 'email' | 'whatsapp' | 'dedicated';

  /** Texto apresentado na página de preços (substitui a lista atual). */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanFeatureTextDto)
  @IsOptional()
  features?: PlanFeatureTextDto[];
}

