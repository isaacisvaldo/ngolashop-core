import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoreService } from './store.service';
import { StoreController } from './store.controller';
import { Store } from './entities/store.entity';
import { AuthModule } from '../shared/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Store]), AuthModule],
  controllers: [StoreController],
  providers: [StoreService],
  exports: [StoreService],
})
export class StoreModule {}
