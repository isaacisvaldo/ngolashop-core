import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStoreDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  slug!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  whatsapp!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  bannerUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  primaryColor?: string;
}
