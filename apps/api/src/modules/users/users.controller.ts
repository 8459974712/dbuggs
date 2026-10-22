import { Controller, Get, Put, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateMeDto } from './update-me.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my profile' })
  me(@Request() req) {
    return req.user;
  }

  @Put('me')
  @ApiOperation({ summary: 'Update my profile (name, email, phone only)' })
  update(@Request() req, @Body() dto: UpdateMeDto) {
    return this.usersService.updateMe(req.user.id, dto);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update my profile (name, email, phone only)' })
  patch(@Request() req, @Body() dto: UpdateMeDto) {
    return this.usersService.updateMe(req.user.id, dto);
  }

  @Put('me/fcm-token')
  @ApiOperation({ summary: 'Update FCM token for push notifications' })
  updateFcm(@Request() req, @Body('token') token: string) {
    return this.usersService.updateFcmToken(req.user.id, token);
  }
}
