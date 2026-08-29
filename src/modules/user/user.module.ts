import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from '../shared/auth/entities/user.entity';
import { Store } from '../store/entities/store.entity';
import { StoreSubscription } from '../subscription/entities/subscription.entity';
import { AuthModule } from '../shared/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Store, StoreSubscription]),
    AuthModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
