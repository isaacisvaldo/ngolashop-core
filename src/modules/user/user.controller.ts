import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../shared/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../shared/auth/decorators/current-user.decorator';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(
    @CurrentUser('storeId') storeId: number,
    @CurrentUser('rootAdmin') rootAdmin: boolean,
    @Body() createUserDto: CreateUserDto,
  ) {
    if (!rootAdmin) {
      throw new Error('Only root admin can create users');
    }
    return this.userService.create(storeId, createUserDto);
  }

  @Get()
  findAll(
    @CurrentUser('storeId') storeId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.userService.findAll(
      storeId,
      page ? +page : 1,
      limit ? +limit : 10,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('storeId') storeId: number) {
    return this.userService.findOne(+id, storeId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('storeId') storeId: number,
    @CurrentUser('rootAdmin') rootAdmin: boolean,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    if (!rootAdmin) {
      throw new Error('Only root admin can update users');
    }
    return this.userService.update(+id, storeId, updateUserDto);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser('storeId') storeId: number,
    @CurrentUser('rootAdmin') rootAdmin: boolean,
  ) {
    if (!rootAdmin) {
      throw new Error('Only root admin can delete users');
    }
    return this.userService.remove(+id, storeId);
  }
}
