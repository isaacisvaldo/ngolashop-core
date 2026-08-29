import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum UserType {
  ADMIN = 'admin',
  STORE = 'store',
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsString()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'senha123' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ enum: UserType, example: UserType.STORE })
  @IsEnum(UserType)
  @IsNotEmpty()
  userType!: UserType;
}
