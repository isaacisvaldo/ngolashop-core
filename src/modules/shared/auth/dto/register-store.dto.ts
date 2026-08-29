import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterStoreDto {
  @ApiProperty({ example: 'Minha Loja' })
  @IsString()
  @IsNotEmpty()
  storeName!: string;

  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'joao@email.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'senha123' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: '923123456' })
  @IsString()
  @IsNotEmpty()
  phone!: string;
}
