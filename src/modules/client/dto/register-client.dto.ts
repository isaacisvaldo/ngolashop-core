import { IsEmail, IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class RegisterClientDto {
  @IsString()
  @MaxLength(150)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @MaxLength(20)
  phone!: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  province?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @IsString()
  @IsOptional()
  address?: string;
}
