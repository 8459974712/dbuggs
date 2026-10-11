import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { Order, OrderStatus } from '../../database/entities/order.entity';
import { Laptop, LaptopStatus } from '../../database/entities/laptop.entity';
import { Rental, RentalStatus } from '../../database/entities/rental.entity';
import { KycDocument, KycDocStatus } from '../../database/entities/kyc-document.entity';
import { Dealer, DealerStatus } from '../../database/entities/dealer.entity';
import { RolePermission } from '../../database/entities/role-permission.entity';
import { User } from '../../database/entities/user.entity';

export const ADMIN_PAGES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'inventory', label: 'Inventory Units' },
  { key: 'qc-grading', label: 'QC & Grading' },
  { key: 'b2c-orders', label: 'B2C Orders' },
  { key: 'returns', label: 'Returns & Refunds' },
  { key: 'b2b-approvals', label: 'B2B Approvals' },
  { key: 'quotations', label: 'Quotations & POs' },
  { key: 'kyc-queue', label: 'KYC Queue' },
  { key: 'rentals', label: 'Rentals & Deposits' },
  { key: 'dealer-applications', label: 'Dealer Applications' },
  { key: 'dealers-tiers', label: 'Dealers & Tiers' },
  { key: 'commission', label: 'Commission & Payouts' },
  { key: 'warranty', label: 'Warranty & Support' },
  { key: 'marketing', label: 'Marketing & CMS' },
  { key: 'finance', label: 'Finance & GST' },
  { key: 'reports', label: 'Reports' },
  { key: 'pricing-rules', label: 'Pricing & Rules' },
  { key: 'admins-roles', label: 'Admins & Roles' },
  { key: 'integrations', label: 'Integrations' },
  { key: 'audit-log', label: 'Audit Log' },
];

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(Laptop) private laptopRepo: Repository<Laptop>,
    @InjectRepository(Rental) private rentalRepo: Repository<Rental>,
    @InjectRepository(KycDocument) private kycRepo: Repository<KycDocument>,
    @InjectRepository(Dealer) private dealerRepo: Repository<Dealer>,
    @InjectRepository(RolePermission) private permRepo: Repository<RolePermission>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async getAdminStaff(): Promise<Partial<User>[]> {
    const staff = await this.userRepo.find({ where: [{ role: 'admin' as any }, { role: 'super_admin' as any }], order: { createdAt: 'ASC' } });
    return staff.map(({ password, ...rest }) => rest);
  }

  async setUserRole(userId: string, role: string): Promise<Partial<User>> {
    if (!['admin', 'super_admin'].includes(role)) {
      throw new ForbiddenException('Role must be admin or super_admin');
    }
    await this.userRepo.update(userId, { role: role as any });
    const { password, ...rest } = await this.userRepo.findOne({ where: { id: userId } });
    return rest;
  }

  async getDashboardStats(): Promise<any> {
    const [
      totalOrders, pendingOrders,
      totalLaptops, availableLaptops,
      activeRentals, overdueRentals,
      pendingKyc,
      activeDealer,
    ] = await Promise.all([
      this.orderRepo.count(),
      this.orderRepo.count({ where: { status: OrderStatus.PROCESSING } }),
      this.laptopRepo.count(),
      this.laptopRepo.count({ where: { status: LaptopStatus.AVAILABLE } }),
      this.rentalRepo.count({ where: { status: RentalStatus.ACTIVE } }),
      this.rentalRepo.count({ where: { status: RentalStatus.OVERDUE } }),
      this.kycRepo.count({ where: { status: KycDocStatus.PENDING } }),
      this.dealerRepo.count({ where: { status: DealerStatus.ACTIVE } }),
    ]);

    return {
      orders: { total: totalOrders, pending: pendingOrders },
      inventory: { total: totalLaptops, available: availableLaptops },
      rentals: { active: activeRentals, overdue: overdueRentals },
      kyc: { pending: pendingKyc },
      dealers: { active: activeDealer },
    };
  }

  async getAuditLog(): Promise<AuditLog[]> {
    return this.auditRepo.find({ order: { createdAt: 'DESC' }, take: 100 });
  }

  async writeAuditLog(adminId: string, data: any): Promise<AuditLog> {
    const log = this.auditRepo.create({ ...data, adminId });
    return this.auditRepo.save(log) as unknown as Promise<AuditLog>;
  }

  async getPermissions(role: string): Promise<any[]> {
    if (role === 'super_admin') {
      return ADMIN_PAGES.map(p => ({ role, page: p.key, label: p.label, canView: true, canCreate: true, canEdit: true, canDelete: true }));
    }
    const saved = await this.permRepo.find({ where: { role } });
    const savedMap = new Map(saved.map(s => [s.page, s]));
    return ADMIN_PAGES.map(p => {
      const s = savedMap.get(p.key);
      return {
        role, page: p.key, label: p.label,
        canView: s ? s.canView : true,
        canCreate: s ? s.canCreate : false,
        canEdit: s ? s.canEdit : false,
        canDelete: s ? s.canDelete : false,
      };
    });
  }

  async setPermissions(role: string, pages: { page: string; canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }[]): Promise<{ message: string }> {
    if (role === 'super_admin') {
      throw new ForbiddenException('Super Admin permissions cannot be modified');
    }
    for (const p of pages) {
      const existing = await this.permRepo.findOne({ where: { role, page: p.page } });
      if (existing) {
        await this.permRepo.update(existing.id, { canView: p.canView, canCreate: p.canCreate, canEdit: p.canEdit, canDelete: p.canDelete });
      } else {
        await this.permRepo.save(this.permRepo.create({ role, page: p.page, ...p }));
      }
    }
    return { message: 'Permissions updated' };
  }
}
