import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  slug?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  iconUrl?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
