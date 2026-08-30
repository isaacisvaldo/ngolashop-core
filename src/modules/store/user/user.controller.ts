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
  ForbiddenException,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationQueryDto } from '../../../common/dtos/pagination-query.dto';
import { JwtAuthGuard } from '../../shared/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/auth/decorators/current-user.decorator';

@ApiTags('Users')
@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Create user for current store' })
  create(
    @CurrentUser('storeId') storeId: number,
    @Body() createUserDto: CreateUserDto,
  ) {
    return this.userService.create(storeId, createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'List users for current store' })
  findAll(
    @CurrentUser('storeId') storeId: number,
    @Query() query: PaginationQueryDto,
  ) {
    return this.userService.findAll(storeId, query.page, query.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('storeId') storeId: number,
  ) {
    return this.userService.findOne(id, storeId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('storeId') storeId: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.update(id, storeId, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('storeId') storeId: number,
  ) {
    return this.userService.remove(id, storeId);
  }
}
