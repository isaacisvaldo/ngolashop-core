import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  Res,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import type { Response } from 'express';
import { existsSync } from 'fs';
import { join } from 'path';
import { UploadService } from './upload.service';
import { UploadFileDto } from './dto/upload-file.dto';
import { DeleteFileDto } from './dto/delete-file.dto';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 10;

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('single')
  @ApiOperation({ summary: 'Upload a single file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async uploadSingle(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }
    const result = await this.uploadService.upload(file, dto);
    return { message: 'Arquivo enviado com sucesso', file: result };
  }

  @Post('multiple')
  @ApiOperation({ summary: 'Upload multiple files (max 10)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES, {
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async uploadMultiple(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UploadFileDto,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }
    const results = await this.uploadService.uploadMultiple(files, dto);
    return { message: 'Arquivos enviados com sucesso', files: results };
  }

  @Get('view')
  @ApiOperation({ summary: 'Get pre-signed URL for S3 file (S3 mode only)' })
  async getFileUrl(
    @Query('key') key: string,
    @Query('expiry') expiry?: string,
  ) {
    if (!key) {
      throw new BadRequestException('O parâmetro "key" é obrigatório');
    }
    const expirySeconds = expiry ? Number(expiry) : 3600;
    const url = await this.uploadService.getPresignedUrl(key, expirySeconds);
    return { url, expiresIn: expirySeconds };
  }

  @Get('stream')
  @ApiOperation({ summary: 'Stream file from S3 (S3 mode only)' })
  async streamFile(@Query('key') key: string, @Res() res: Response) {
    if (!key) {
      throw new BadRequestException('O parâmetro "key" é obrigatório');
    }
    const { stream, contentType } = await this.uploadService.getFileStream(key);
    res.set({ 'Content-Type': contentType, 'Content-Disposition': 'inline' });
    return new StreamableFile(stream);
  }

  @Get('local/:filename')
  @ApiOperation({ summary: 'Get uploaded local file' })
  async getLocalFile(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = join(process.cwd(), 'uploads', filename);
    if (!existsSync(filePath)) {
      throw new NotFoundException('Arquivo não encontrado');
    }
    return res.sendFile(filePath);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete file from S3 (S3 mode only)' })
  async deleteFile(@Body() dto: DeleteFileDto) {
    await this.uploadService.delete(dto.key);
    return { message: 'Arquivo deletado com sucesso', key: dto.key };
  }
}
