import { Controller, Post, Body, HttpCode, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-otp')
  @ApiOperation({ summary: 'Send OTP to phone number' })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto.phone);
  }

  @Post('verify-otp')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify OTP and get JWT token' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.phone, dto.otp);
  }

  @Post('admin-login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Admin email/password login (may require 2FA)' })
  adminLogin(@Body() body: { email: string; password: string }) {
    return this.authService.adminLogin(body.email, body.password);
  }

  @Post('verify-2fa')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify 2FA TOTP code after admin login' })
  verify2fa(@Body() body: { tempToken: string; code: string }) {
    return this.authService.verify2fa(body.tempToken, body.code);
  }

  @Post('2fa/setup')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate 2FA secret for setup' })
  setup2fa(@Request() req) {
    return this.authService.setup2fa(req.user.id);
  }

  @Post('2fa/confirm')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm 2FA setup with TOTP code' })
  confirm2fa(@Request() req, @Body() body: { secret: string; code: string }) {
    return this.authService.confirm2fa(req.user.id, body.secret, body.code);
  }

  @Post('2fa/disable')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable 2FA with current code' })
  disable2fa(@Request() req, @Body('code') code: string) {
    return this.authService.disable2fa(req.user.id, code);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post('signup')
  @HttpCode(201)
  signup(@Body() body: { name: string; email: string; phone: string; password: string; role?: string }) {
    return this.authService.signup(body);
  }

  @Post('set-password')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  setPassword(@Request() req, @Body('password') password: string) {
    return this.authService.setPassword(req.user.id, password);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }
}
