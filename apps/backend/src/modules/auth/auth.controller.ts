import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';
import { RegisterDeviceDto } from './dto/register-device.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.validateAndLogin(dto);
    return {
      success: true,
      data: result,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto) {
    const result = await this.authService.refreshToken(dto);
    return {
      success: true,
      data: result,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout() {
    // In production, token is blacklisted in Redis
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  @Post('device/register')
  @HttpCode(HttpStatus.CREATED)
  async registerDevice(@Body() dto: RegisterDeviceDto) {
    const result = await this.authService.registerDevice(dto);
    return {
      success: true,
      data: result,
    };
  }
}
