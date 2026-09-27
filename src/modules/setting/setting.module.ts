import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Setting } from './entities/setting.entity';
import { SettingService } from './setting.service';
import { SettingController } from './setting.controller';
import { AuthModule } from '../shared/auth/auth.module';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Setting]), AuthModule],
  controllers: [SettingController],
  providers: [SettingService],
  exports: [SettingService],
})
export class SettingModule {}
