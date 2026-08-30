import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadFileDto {
  @ApiPropertyOptional({ example: 'products', description: 'Folder path inside storage' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  folder?: string;

  @ApiPropertyOptional({ example: 'my-image', description: 'Custom filename (without extension)' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  fileName?: string;
}
