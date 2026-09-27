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
  UseGuards,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { existsSync } from 'fs';
import { memoryStorage } from 'multer';
import { UploadService, ALLOWED_MIME_TYPES } from './upload.service';
import { UploadFileDto } from './dto/upload-file.dto';
import { DeleteFileDto } from './dto/delete-file.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/decorators/current-user.decorator';
import { requireUserType } from '../../../common/require-user-type';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 10;

const multerOptions = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req: unknown, file: Express.Multer.File, cb: (err: Error | null, ok: boolean) => void) => {
    if (ALLOWED_MIME_TYPES[file.mimetype]) cb(null, true);
    else cb(new BadRequestException('Tipo de ficheiro não permitido (use JPG, PNG, WEBP, GIF ou PDF)'), false);
  },
};

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('single')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload a single file (autenticado)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async uploadSingle(@UploadedFile() file: Express.Multer.File, @Body() dto: UploadFileDto) {
    if (!file) throw new BadRequestException('Nenhum ficheiro enviado');
    const result = await this.uploadService.upload(file, dto);
    return { message: 'Ficheiro enviado com sucesso', file: result };
  }

  @Post('multiple')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload multiple files (max 10, autenticado)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', MAX_FILES, multerOptions))
  async uploadMultiple(@UploadedFiles() files: Express.Multer.File[], @Body() dto: UploadFileDto) {
    if (!files || files.length === 0) throw new BadRequestException('Nenhum ficheiro enviado');
    const results = await this.uploadService.uploadMultiple(files, dto);
    return { message: 'Ficheiros enviados com sucesso', files: results };
  }

  @Get('config')
  @ApiOperation({ summary: 'Driver de upload ativo' })
  config() {
    return { mode: this.uploadService.mode, maxFileSize: MAX_FILE_SIZE, allowed: Object.keys(ALLOWED_MIME_TYPES) };
  }

  @Get('view')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Pre-signed URL (apenas UPLOAD_MODE=s3)' })
  async getFileUrl(@Query('key') key: string, @Query('expiry') expiry?: string) {
    if (!key) throw new BadRequestException('O parâmetro "key" é obrigatório');
    const expirySeconds = Math.min(Math.max(Number(expiry) || 3600, 60), 7 * 24 * 3600);
    const url = await this.uploadService.getPresignedUrl(key, expirySeconds);
    return { url, expiresIn: expirySeconds };
  }

  @Get('stream')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Stream de ficheiro (apenas UPLOAD_MODE=s3)' })
  async streamFile(@Query('key') key: string, @Res({ passthrough: true }) res: Response) {
    if (!key) throw new BadRequestException('O parâmetro "key" é obrigatório');
    const { stream, contentType } = await this.uploadService.getFileStream(key);
    res.set({ 'Content-Type': contentType, 'Content-Disposition': 'inline' });
    return new StreamableFile(stream);
  }

  @Get('local/:filename')
  @ApiOperation({ summary: 'Servir ficheiro local (apenas UPLOAD_MODE=local)' })
  getLocalFile(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = this.uploadService.localPath(filename);
    if (!filePath || !existsSync(filePath)) throw new NotFoundException('Ficheiro não encontrado');
    res.set({ 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' });
    return res.sendFile(filePath);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apagar ficheiro (lojas e admins)' })
  async deleteFile(@Body() dto: DeleteFileDto, @CurrentUser() user: JwtPayload) {
    requireUserType(user, 'store', 'admin');
    await this.uploadService.delete(dto.key);
    return { message: 'Ficheiro apagado com sucesso', key: dto.key };
  }
}
