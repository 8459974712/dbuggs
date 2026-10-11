import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard stats — all channels' })
  dashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('audit-log')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Super Admin: audit log' })
  auditLog() {
    return this.adminService.getAuditLog();
  }

  @Post('audit-log')
  @ApiOperation({ summary: 'Write audit log entry' })
  writeAuditLog(@Request() req, @Body() body: any) {
    return this.adminService.writeAuditLog(req.user.id, body);
  }

  @Get('staff')
  @ApiOperation({ summary: 'List admin/super_admin users' })
  getStaff() {
    return this.adminService.getAdminStaff();
  }

  @Put('staff/:id/role')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Super Admin: set a staff member role (admin/super_admin)' })
  setStaffRole(@Param('id') id: string, @Body('role') role: string) {
    return this.adminService.setUserRole(id, role);
  }

  @Get('permissions/:role')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Get page permissions for a role' })
  getPermissions(@Param('role') role: string) {
    return this.adminService.getPermissions(role);
  }

  @Put('permissions/:role')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Super Admin: set page permissions for a role' })
  setPermissions(@Param('role') role: string, @Body('pages') pages: any[]) {
    return this.adminService.setPermissions(role, pages);
  }
}
