import { Controller, Get, Post, Put, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DealerService } from './dealer.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('dealer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dealer')
export class DealerController {
  constructor(private readonly dealerService: DealerService) {}

  // ── Dealer Registration & Profile ──
  @Post('register')
  @ApiOperation({ summary: 'Register as dealer' })
  register(@Request() req, @Body() body: any) {
    return this.dealerService.register(req.user.id, body);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my dealer profile' })
  myProfile(@Request() req) {
    return this.dealerService.findByUser(req.user.id);
  }

  @Put('my')
  @ApiOperation({ summary: 'Update my dealer profile' })
  updateProfile(@Request() req, @Body() body: any) {
    return this.dealerService.updateProfile(req.user.id, body);
  }

  // ── Dashboard (#81) ──
  @Get('dashboard')
  @ApiOperation({ summary: 'Dealer dashboard' })
  async dashboard(@Request() req) {
    const dealer = await this.dealerService.findByUser(req.user.id);
    if (!dealer) return { error: 'Not a dealer' };
    return this.dealerService.getDashboard(dealer.id);
  }

  // ── Stock Orders (#83) ──
  @Post('stock-orders')
  @ApiOperation({ summary: 'Create stock order' })
  async createStockOrder(@Request() req, @Body() body: any) {
    const dealer = await this.dealerService.findByUser(req.user.id);
    if (!dealer) return { error: 'Not a dealer' };
    return this.dealerService.createStockOrder(dealer.id, body.items);
  }

  @Get('stock-orders')
  @ApiOperation({ summary: 'My stock orders' })
  async myStockOrders(@Request() req) {
    const dealer = await this.dealerService.findByUser(req.user.id);
    if (!dealer) return [];
    return this.dealerService.getMyStockOrders(dealer.id);
  }

  // ── Inventory (#84) ──
  @Get('inventory')
  @ApiOperation({ summary: 'My inventory' })
  async myInventory(@Request() req) {
    const dealer = await this.dealerService.findByUser(req.user.id);
    if (!dealer) return { total: 0, sold: 0, inStock: 0, items: [] };
    return this.dealerService.getMyInventory(dealer.id);
  }

  // ── Sales & Invoice (#85) ──
  @Post('sales')
  @ApiOperation({ summary: 'Record a customer sale' })
  async recordSale(@Request() req, @Body() body: any) {
    const dealer = await this.dealerService.findByUser(req.user.id);
    if (!dealer) return { error: 'Not a dealer' };
    return this.dealerService.recordSale(dealer.id, body);
  }

  @Get('sales')
  @ApiOperation({ summary: 'My sales history' })
  async mySales(@Request() req) {
    const dealer = await this.dealerService.findByUser(req.user.id);
    if (!dealer) return [];
    return this.dealerService.getMySales(dealer.id);
  }

  // ── Commission & Payouts (#87) ──
  @Get('commissions')
  @ApiOperation({ summary: 'My commission history' })
  async myCommissions(@Request() req) {
    const dealer = await this.dealerService.findByUser(req.user.id);
    if (!dealer) return [];
    return this.dealerService.getCommissions(dealer.id);
  }

  @Post('payout')
  @ApiOperation({ summary: 'Request commission payout' })
  async requestPayout(@Request() req, @Body('amount') amount: number) {
    const dealer = await this.dealerService.findByUser(req.user.id);
    if (!dealer) return { error: 'Not a dealer' };
    return this.dealerService.requestPayout(dealer.id, amount);
  }

  // ── Leads (#88) ──
  @Post('leads')
  @ApiOperation({ summary: 'Create a lead' })
  async createLead(@Request() req, @Body() body: any) {
    const dealer = await this.dealerService.findByUser(req.user.id);
    if (!dealer) return { error: 'Not a dealer' };
    return this.dealerService.createLead(dealer.id, body);
  }

  @Get('leads')
  @ApiOperation({ summary: 'My leads' })
  async myLeads(@Request() req) {
    const dealer = await this.dealerService.findByUser(req.user.id);
    if (!dealer) return [];
    return this.dealerService.getMyLeads(dealer.id);
  }

  @Put('leads/:id')
  @ApiOperation({ summary: 'Update a lead' })
  async updateLead(@Param('id') id: string, @Request() req, @Body() body: any) {
    const dealer = await this.dealerService.findByUser(req.user.id);
    if (!dealer) return { error: 'Not a dealer' };
    return this.dealerService.updateLead(id, dealer.id, body);
  }

  // ── Targets (#89) ──
  @Get('targets')
  @ApiOperation({ summary: 'My targets' })
  async myTargets(@Request() req) {
    const dealer = await this.dealerService.findByUser(req.user.id);
    if (!dealer) return [];
    return this.dealerService.getMyTargets(dealer.id);
  }

  // ── Leaderboard (#98) ──
  @Get('leaderboard')
  @ApiOperation({ summary: 'Dealer leaderboard' })
  leaderboard() {
    return this.dealerService.getLeaderboard();
  }

  // ══════════════ ADMIN ENDPOINTS ══════════════

  @Get('admin/all')
  @ApiOperation({ summary: 'Admin: list all dealers' })
  @Roles('admin', 'super_admin')
  @UseGuards(RolesGuard)
  findAll() {
    return this.dealerService.findAll();
  }

  @Get('admin/applications')
  @ApiOperation({ summary: 'Admin: pending dealer applications' })
  @Roles('admin', 'super_admin')
  @UseGuards(RolesGuard)
  applications() {
    return this.dealerService.getPendingApplications();
  }

  @Put('admin/:id/approve')
  @ApiOperation({ summary: 'Admin: approve dealer' })
  @Roles('admin', 'super_admin')
  @UseGuards(RolesGuard)
  approve(@Param('id') id: string, @Body() body: any, @Request() req) {
    return this.dealerService.approve(id, body, req.user.id);
  }

  @Put('admin/:id/reject')
  @ApiOperation({ summary: 'Admin: reject dealer' })
  @Roles('admin', 'super_admin')
  @UseGuards(RolesGuard)
  reject(@Param('id') id: string, @Body('reason') reason: string) {
    return this.dealerService.reject(id, reason);
  }

  @Put('admin/:id')
  @ApiOperation({ summary: 'Admin: update dealer (tier, commission, territory, credit, KYC)' })
  @Roles('admin', 'super_admin')
  @UseGuards(RolesGuard)
  updateDealer(@Param('id') id: string, @Body() body: any) {
    return this.dealerService.updateDealer(id, body);
  }

  @Get('admin/stock-orders')
  @ApiOperation({ summary: 'Admin: all stock orders' })
  @Roles('admin', 'super_admin')
  @UseGuards(RolesGuard)
  allStockOrders() {
    return this.dealerService.getAllStockOrders();
  }

  @Put('admin/stock-orders/:id')
  @ApiOperation({ summary: 'Admin: update stock order' })
  @Roles('admin', 'super_admin')
  @UseGuards(RolesGuard)
  updateStockOrder(@Param('id') id: string, @Body() body: any) {
    return this.dealerService.updateStockOrder(id, body);
  }

  @Get('admin/leads')
  @ApiOperation({ summary: 'Admin: all dealer leads' })
  @Roles('admin', 'super_admin')
  @UseGuards(RolesGuard)
  allLeads() {
    return this.dealerService.getAllLeads();
  }

  @Get('admin/targets')
  @ApiOperation({ summary: 'Admin: all targets' })
  @Roles('admin', 'super_admin')
  @UseGuards(RolesGuard)
  allTargets() {
    return this.dealerService.getAllTargets();
  }

  @Post('admin/targets')
  @ApiOperation({ summary: 'Admin: set/update target for dealer' })
  @Roles('admin', 'super_admin')
  @UseGuards(RolesGuard)
  setTarget(@Body() body: any) {
    return this.dealerService.setTarget(body);
  }

  @Put('admin/payout/:id/approve')
  @ApiOperation({ summary: 'Admin: approve payout' })
  @Roles('admin', 'super_admin')
  @UseGuards(RolesGuard)
  approvePayout(@Param('id') id: string) {
    return this.dealerService.adminApprovePayout(id);
  }

  @Get('admin/leaderboard')
  @ApiOperation({ summary: 'Admin: dealer leaderboard' })
  @Roles('admin', 'super_admin')
  @UseGuards(RolesGuard)
  adminLeaderboard() {
    return this.dealerService.getLeaderboard();
  }
}
