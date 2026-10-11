import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
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
  @ApiOperation({ summary: 'Update my profile' })
  update(@Request() req, @Body() body: any) {
    return this.usersService.update(req.user.id, body);
  }

  @Put('me/fcm-token')
  @ApiOperation({ summary: 'Update FCM token for push notifications' })
  updateFcm(@Request() req, @Body('token') token: string) {
    return this.usersService.updateFcmToken(req.user.id, token);
  }
}
