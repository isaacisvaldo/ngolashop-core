import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsDateString, Max, MaxLength, Min } from 'class-validator';

export class QuoteQueryDto {
  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsInt()
  planId!: number;

  @ApiProperty({ enum: ['monthly', 'quarterly', 'annual'] })
  @IsIn(['monthly', 'quarterly', 'annual'])
  cycle!: 'monthly' | 'quarterly' | 'annual';
}

export class CreateInvoiceDto extends QuoteQueryDto {
  @ApiProperty({ enum: ['multicaixa_express', 'reference', 'transfer'] })
  @IsIn(['multicaixa_express', 'reference', 'transfer'])
  paymentMethod!: 'multicaixa_express' | 'reference' | 'transfer';
}

export class SubmitProofDto {
  @ApiPropertyOptional({ description: 'URL do comprovativo (obtido em POST /upload/single)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  proofUrl?: string;

  @ApiPropertyOptional({ example: 'MCX 8834 2291', description: 'ID da transação / referência paga' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  paymentReference?: string;

  @ApiPropertyOptional({ enum: ['multicaixa_express', 'reference', 'transfer'] })
  @IsOptional()
  @IsIn(['multicaixa_express', 'reference', 'transfer'])
  paymentMethod?: 'multicaixa_express' | 'reference' | 'transfer';
}

export class RejectInvoiceDto {
  @ApiProperty({ example: 'Comprovativo ilegível' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}

export class GrantPlanDto {
  @ApiProperty({ example: 5 })
  @IsInt()
  planId!: number;

  @ApiProperty({ example: 30 })
  @IsInt()
  @Min(1)
  @Max(3650)
  days!: number;

  @ApiPropertyOptional({ example: 'Oferta de parceria' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string;
}

export class TrackEventDto {
  @ApiProperty({ example: 8 })
  @IsInt()
  storeId!: number;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  productId?: number;

  @ApiProperty({ enum: ['store_view', 'product_view', 'whatsapp_click', 'product_click'] })
  @IsIn(['store_view', 'product_view', 'whatsapp_click', 'product_click'])
  type!: 'store_view' | 'product_view' | 'whatsapp_click' | 'product_click';

  @ApiPropertyOptional({ example: 'a1b2c3', description: 'Identificador anónimo do visitante (gerado no browser)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  visitorId?: string;

  @ApiPropertyOptional({ example: 12, description: 'Destaque que originou a visita' })
  @IsOptional()
  @IsInt()
  highlightId?: number;
}

export class CouponDto {
  @ApiProperty({ example: 'BEMVINDO10' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  code!: string;

  @ApiProperty({ enum: ['percent', 'fixed'] })
  @IsIn(['percent', 'fixed'])
  type!: 'percent' | 'fixed';

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0.01)
  value!: number;

  @ApiPropertyOptional({ example: 20000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number | null;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startsAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endsAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  isActive?: boolean;
}

export class ValidateCouponDto {
  @ApiProperty({ example: 8 })
  @IsInt()
  storeId!: number;

  @ApiProperty({ example: 'BEMVINDO10' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  code!: string;

  @ApiProperty({ example: 25000 })
  @IsNumber()
  @Min(0)
  subtotal!: number;
}

export class BookHighlightDto {
  @ApiProperty({ enum: ['category_top', 'search_top', 'home_carousel', 'store_featured'] })
  @IsIn(['category_top', 'search_top', 'home_carousel', 'store_featured'])
  format!: 'category_top' | 'search_top' | 'home_carousel' | 'store_featured';

  @ApiProperty({ enum: [3, 7, 15] })
  @IsIn([3, 7, 15])
  days!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  productId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional({ example: 'sapatilhas' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  keyword?: string;

  @ApiProperty({ enum: ['wallet', 'included', 'credit'] })
  @IsIn(['wallet', 'included', 'credit'])
  payWith!: 'wallet' | 'included' | 'credit';

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  creditId?: number;
}

export class HighlightQuoteDto {
  @ApiProperty()
  @IsIn(['category_top', 'search_top', 'home_carousel', 'store_featured'])
  format!: 'category_top' | 'search_top' | 'home_carousel' | 'store_featured';

  @ApiProperty()
  @Type(() => Number)
  @IsIn([3, 7, 15])
  days!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  productId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  keyword?: string;
}

export class PlacementsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  search?: string;
}

export class TopupDto {
  @ApiProperty()
  @IsInt()
  packageId!: number;

  @ApiProperty({ enum: ['multicaixa_express', 'reference', 'transfer'] })
  @IsIn(['multicaixa_express', 'reference', 'transfer'])
  paymentMethod!: 'multicaixa_express' | 'reference' | 'transfer';
}

export class UpdateHighlightFormatDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  slots?: number;

  @IsOptional()
  prices?: Record<string, number>;

  @IsOptional()
  isActive?: boolean;
}

export class WalletPackageDto {
  @IsNumber()
  @Min(1)
  payAmount!: number;

  @IsNumber()
  @Min(1)
  creditAmount!: number;

  @IsOptional()
  isActive?: boolean;
}

export class GrantHighlightCreditDto {
  @IsIn(['category_top', 'search_top', 'home_carousel', 'store_featured'])
  format!: 'category_top' | 'search_top' | 'home_carousel' | 'store_featured';

  @IsIn([3, 7, 15])
  days!: number;
}
