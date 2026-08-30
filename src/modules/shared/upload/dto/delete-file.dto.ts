import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteFileDto {
  @ApiProperty({ example: 'uploads/products/1712345678901-photo.jpg' })
  @IsNotEmpty()
  @IsString()
  key!: string;
}
