import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateProductImageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  altText?: string;

  @IsNumber()
  position: number = 0;
}
