import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsObject } from 'class-validator';
import { SettingService } from './setting.service';
import { JwtAuthGuard } from '../shared/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../shared/auth/guards/admin.guard';
import { RequiredPermissions } from '../shared/auth/decorators/required-permissions.decorator';

class UpdateSettingsDto {
  @IsObject()
  values!: Record<string, string | number | boolean>;
}

@ApiTags('Settings')
@Controller()
export class SettingController {
  constructor(private readonly settingService: SettingService) {}

  @Get('settings/public')
  @ApiOperation({ summary: 'Public platform settings' })
  findPublic() {
    return this.settingService.findPublic();
  }

  @Get('admin/settings')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @RequiredPermissions('config.read')
  @ApiOperation({ summary: 'List all settings (admin)' })
  findAll() {
    return this.settingService.findAll();
  }

  @Put('admin/settings')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @RequiredPermissions('config.write')
  @ApiOperation({ summary: 'Update settings (admin)' })
  update(@Body() dto: UpdateSettingsDto) {
    return this.settingService.updateMany(dto.values);
  }
}
