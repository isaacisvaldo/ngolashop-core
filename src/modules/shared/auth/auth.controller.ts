import { Controller, Post, Get, Patch, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterStoreDto } from './dto/register-store.dto';
import { RegisterClientDto } from '../../client/dto/register-client.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, type JwtPayload } from './decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login (admin, store or client)' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  me(@CurrentUser() user: JwtPayload) {
    return this.authService.getMe(user.sub, user.type);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile (name, phone)' })
  updateMe(@CurrentUser() user: JwtPayload, @Body() body: { name?: string; phone?: string }) {
    return this.authService.updateMe(user.sub, user.type, body);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change current user password' })
  changePassword(@CurrentUser() user: JwtPayload, @Body() body: { currentPassword: string; newPassword: string }) {
    return this.authService.changePassword(user.sub, user.type, body.currentPassword, body.newPassword);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout' })
  @ApiResponse({ status: 200, description: 'Logged out' })
  logout(@CurrentUser() user: JwtPayload) {
    return this.authService.logout(user.sub, user.type);
  }

  @Get('client-stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get client order statistics' })
  @ApiResponse({ status: 200, description: 'Client stats' })
  clientStats(@CurrentUser() user: JwtPayload) {
    return this.authService.getClientStats(user.sub);
  }

  @Post('register/store')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new store with root user' })
  @ApiResponse({ status: 201, description: 'Store registered' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  registerStore(@Body() dto: RegisterStoreDto) {
    return this.authService.registerStore(dto);
  }

  @Post('register/client')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new client' })
  @ApiResponse({ status: 201, description: 'Client registered' })
  @ApiResponse({ status: 409, description: 'Email or phone already in use' })
  registerClient(@Body() dto: RegisterClientDto) {
    return this.authService.registerClient(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }
}
