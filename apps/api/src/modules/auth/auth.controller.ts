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
  @ApiOperation({ summary: 'Admin email/password login' })
  adminLogin(@Body() body: { email: string; password: string }) {
    return this.authService.adminLogin(body.email, body.password);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Email/password login — any role (B2C, B2B, dealer, admin)' })
  login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post('signup')
  @HttpCode(201)
  @ApiOperation({ summary: 'Register new B2C/B2B customer with email/password' })
  signup(@Body() body: { name: string; email: string; phone: string; password: string; role?: string }) {
    return this.authService.signup(body);
  }

  @Post('set-password')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set/change password for logged-in user' })
  setPassword(@Request() req, @Body('password') password: string) {
    return this.authService.setPassword(req.user.id, password);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh JWT token' })
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }
}
