import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rental, RentalStatus } from '../../database/entities/rental.entity';
import { KycDocument, KycDocStatus, KycDocType } from '../../database/entities/kyc-document.entity';
import { Laptop, LaptopStatus } from '../../database/entities/laptop.entity';

@Injectable()
export class RentalService {
  constructor(
    @InjectRepository(Rental) private rentalRepo: Repository<Rental>,
    @InjectRepository(KycDocument) private kycRepo: Repository<KycDocument>,
    @InjectRepository(Laptop) private laptopRepo: Repository<Laptop>,
  ) {}

  // Step 1: Product + EMI plan selection -> create rental application
  async createApplication(userId: string, data: any): Promise<Rental> {
    const rental = this.rentalRepo.create({
      userId,
      laptopId: data.laptopId,
      monthlyRent: data.monthlyRent || 0,
      depositAmount: data.depositAmount || 0,
      tenure: data.tenure || 6,
      totalPayable: (data.monthlyRent || 0) * (data.tenure || 6),
      status: RentalStatus.KYC_PENDING,
    });
    return this.rentalRepo.save(rental);
  }

  // Step 2: Mobile number verification
  async verifyMobile(rentalId: string, data: any): Promise<Rental> {
    const rental = await this.rentalRepo.findOne({ where: { id: rentalId } });
    if (!rental) throw new NotFoundException('Application not found');
    await this.rentalRepo.update(rentalId, { mobileVerified: true });
    return this.rentalRepo.findOne({ where: { id: rentalId } });
  }

  // Step 3: PAN verification
  async verifyPan(rentalId: string, panNumber: string): Promise<Rental> {
    const rental = await this.rentalRepo.findOne({ where: { id: rentalId } });
    if (!rental) throw new NotFoundException('Application not found');
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(panNumber.toUpperCase())) {
      throw new BadRequestException('Invalid PAN format');
    }
    await this.rentalRepo.update(rentalId, {
      panNumber: panNumber.toUpperCase(),
      status: RentalStatus.PAN_VERIFIED,
    });
    return this.rentalRepo.findOne({ where: { id: rentalId } });
  }

  // Step 4: KYC documents (Aadhaar + selfie)
  async submitKyc(userId: string, data: any): Promise<KycDocument> {
    const doc = this.kycRepo.create({ ...data, userId, status: KycDocStatus.PENDING });
    return this.kycRepo.save(doc) as unknown as Promise<KycDocument>;
  }

  // Step 5: Income & eligibility
  async submitIncome(rentalId: string, data: any): Promise<Rental> {
    const rental = await this.rentalRepo.findOne({ where: { id: rentalId } });
    if (!rental) throw new NotFoundException('Application not found');
    const monthlyIncome = Number(data.monthlyIncome) || 0;
    const emiAmount = Number(rental.monthlyRent) || 0;
    const emiToIncomeRatio = monthlyIncome > 0 ? (emiAmount / monthlyIncome) * 100 : 100;
    const eligible = emiToIncomeRatio <= 40 && monthlyIncome >= 15000;
    await this.rentalRepo.update(rentalId, {
      monthlyIncome: data.monthlyIncome,
      employmentType: data.employmentType,
      creditStatus: eligible ? 'eligible' : 'not_eligible',
      status: RentalStatus.CREDIT_CHECK,
    });
    return this.rentalRepo.findOne({ where: { id: rentalId } });
  }

  // Step 6-7: Admin credit assessment & approval
  async assessCredit(rentalId: string, adminId: string, data: any): Promise<Rental> {
    const rental = await this.rentalRepo.findOne({ where: { id: rentalId } });
    if (!rental) throw new NotFoundException('Application not found');
    const decision = data.decision;
    let status: RentalStatus;
    if (decision === 'approve') {
      status = RentalStatus.APPROVED;
    } else if (decision === 'reject') {
      status = RentalStatus.REJECTED;
    } else {
      status = RentalStatus.MANUAL_REVIEW;
    }
    const emiSchedule = decision === 'approve' ? this.generateEmiSchedule(rental) : null;
    await this.rentalRepo.update(rentalId, {
      creditScore: data.creditScore || null,
      creditStatus: decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'manual_review',
      status,
      rejectionReason: data.rejectionReason || null,
      approvedBy: adminId,
      approvedAt: decision === 'approve' ? new Date() : null,
      emiSchedule,
    });
    return this.rentalRepo.findOne({ where: { id: rentalId } });
  }

  // Step 8: Generate EMI schedule
  private generateEmiSchedule(rental: Rental): any[] {
    const schedule = [];
    const emi = Number(rental.monthlyRent);
    const tenure = rental.tenure || 6;
    const startDate = new Date();
    for (let i = 1; i <= tenure; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      schedule.push({
        installment: i,
        amount: emi,
        dueDate: dueDate.toISOString().split('T')[0],
        status: 'upcoming',
      });
    }
    return schedule;
  }

  // Step 9: Get EMI schedule for user
  async getEmiSchedule(rentalId: string): Promise<any> {
    const rental = await this.rentalRepo.findOne({ where: { id: rentalId } });
    if (!rental) throw new NotFoundException('Rental not found');
    return {
      rentalId: rental.id,
      tenure: rental.tenure,
      monthlyEmi: rental.monthlyRent,
      depositAmount: rental.depositAmount,
      totalPayable: rental.totalPayable,
      processingFee: rental.processingFee,
      schedule: rental.emiSchedule || [],
      status: rental.status,
    };
  }

  // Step 10: Agreement & activate after deposit
  async acceptAgreement(rentalId: string): Promise<Rental> {
    const rental = await this.rentalRepo.findOne({ where: { id: rentalId } });
    if (!rental) throw new NotFoundException('Rental not found');
    if (rental.status !== RentalStatus.APPROVED) {
      throw new BadRequestException('Application not yet approved');
    }
    await this.rentalRepo.update(rentalId, { status: RentalStatus.DEPOSIT_PENDING });
    return this.rentalRepo.findOne({ where: { id: rentalId } });
  }

  // KYC approval (admin)
  async approveKyc(kycId: string, reviewedBy: string): Promise<KycDocument> {
    await this.kycRepo.update(kycId, { status: KycDocStatus.APPROVED, reviewedBy });
    const doc = await this.kycRepo.findOne({ where: { id: kycId } });
    if (doc) {
      const pending = await this.kycRepo.count({ where: { userId: doc.userId, status: KycDocStatus.PENDING } });
      if (pending === 0) {
        await this.rentalRepo.update(
          { userId: doc.userId, status: RentalStatus.KYC_PENDING },
          { status: RentalStatus.KYC_APPROVED },
        );
      }
    }
    return doc;
  }

  async rejectKyc(kycId: string, reason: string): Promise<KycDocument> {
    await this.kycRepo.update(kycId, { status: KycDocStatus.REJECTED, rejectionReason: reason });
    return this.kycRepo.findOne({ where: { id: kycId } });
  }

  async getKycQueue(): Promise<KycDocument[]> {
    return this.kycRepo.find({ where: { status: KycDocStatus.PENDING }, order: { createdAt: 'ASC' } });
  }

  async getAllKycByStatus(status?: string): Promise<KycDocument[]> {
    const where: any = {};
    if (status === 'approved') where.status = KycDocStatus.APPROVED;
    else if (status === 'rejected') where.status = KycDocStatus.REJECTED;
    else if (status === 'pending') where.status = KycDocStatus.PENDING;
    return this.kycRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async book(userId: string, data: any): Promise<Rental> {
    const kyc = await this.kycRepo.findOne({ where: { userId, status: KycDocStatus.APPROVED } });
    if (!kyc) throw new BadRequestException('KYC not approved. Please complete KYC first.');
    const rental = this.rentalRepo.create({
      userId,
      laptopId: data.laptopId,
      monthlyRent: data.monthlyRent,
      depositAmount: data.depositAmount,
      tenure: data.tenure || 6,
      totalPayable: (data.monthlyRent || 0) * (data.tenure || 6),
      status: RentalStatus.DEPOSIT_PENDING,
    });
    return this.rentalRepo.save(rental);
  }

  async createFromCheckout(userId: string, data: any): Promise<any> {
    const savedDocs: KycDocument[] = [];
    if (data.documents) {
      const docMap: { key: string; type: KycDocType }[] = [
        { key: 'aadhaarFront', type: KycDocType.AADHAAR },
        { key: 'aadhaarBack', type: KycDocType.AADHAAR },
        { key: 'panCard', type: KycDocType.PAN },
        { key: 'selfie', type: KycDocType.PAN },
      ];
      for (const { key, type } of docMap) {
        if (data.documents[key]) {
          try {
            const doc = await this.kycRepo.save(this.kycRepo.create({
              userId,
              type,
              docUrlEncrypted: data.documents[key].substring(0, 500000),
              selfieUrl: key === 'selfie' ? data.documents[key].substring(0, 500000) : null,
              status: KycDocStatus.PENDING,
            }));
            savedDocs.push(doc);
          } catch (e) { /* skip duplicates */ }
        }
      }
    }

    const tenure = data.tenure || 6;
    const monthlyAmount = data.monthlyAmount || 0;
    const rental = this.rentalRepo.create({
      userId,
      laptopId: data.laptopId,
      monthlyRent: monthlyAmount,
      depositAmount: data.depositAmount || 0,
      tenure,
      totalPayable: monthlyAmount * tenure,
      panNumber: data.panNumber || null,
      mobileVerified: true,
      monthlyIncome: data.monthlyIncome || null,
      employmentType: data.employmentType || null,
      status: RentalStatus.KYC_PENDING,
    });
    const savedRental = await this.rentalRepo.save(rental);

    return {
      ...savedRental,
      kycStatus: 'pending',
      kycDocsCount: savedDocs.length,
      message: 'EMI application submitted. KYC documents under review.',
    };
  }

  async getUserKycStatus(userId: string): Promise<any> {
    const docs = await this.kycRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
    const rentals = await this.rentalRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
    const allApproved = docs.length > 0 && docs.every(d => d.status === KycDocStatus.APPROVED);
    const anyPending = docs.some(d => d.status === KycDocStatus.PENDING);
    const anyRejected = docs.some(d => d.status === KycDocStatus.REJECTED);
    return {
      kycStatus: allApproved ? 'approved' : anyRejected ? 'rejected' : anyPending ? 'pending' : 'not_submitted',
      documents: docs.map(d => ({ id: d.id, type: d.type, status: d.status, rejectionReason: d.rejectionReason })),
      rentals: rentals,
    };
  }

  // Admin: get all applications for credit review
  async getCreditQueue(): Promise<Rental[]> {
    return this.rentalRepo.find({
      where: [
        { status: RentalStatus.CREDIT_CHECK },
        { status: RentalStatus.KYC_APPROVED },
        { status: RentalStatus.MANUAL_REVIEW },
      ],
      order: { createdAt: 'ASC' },
    });
  }

  // Admin: get all rental applications
  async getAllApplications(status?: string): Promise<Rental[]> {
    const where: any = {};
    if (status) where.status = status;
    return this.rentalRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findByUser(userId: string): Promise<Rental[]> {
    return this.rentalRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async findAll(): Promise<Rental[]> {
    return this.rentalRepo.find({ order: { createdAt: 'DESC' } });
  }

  async recordDeposit(rentalId: string, data: any): Promise<Rental> {
    const rental = await this.rentalRepo.findOne({ where: { id: rentalId } });
    if (!rental) throw new NotFoundException('Rental not found');
    const startDate = new Date();
    const nextDueDate = new Date(startDate);
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    const emiSchedule = this.generateEmiSchedule(rental);
    await this.rentalRepo.update(rentalId, {
      status: RentalStatus.ACTIVE,
      startDate,
      nextDueDate,
      emiSchedule,
    });
    const updatedRental = await this.rentalRepo.findOne({ where: { id: rentalId } });
    await this.laptopRepo.update(rental.laptopId, { status: LaptopStatus.RENTED });
    return updatedRental;
  }

  async setupAutopay(rentalId: string, data: any): Promise<Rental> {
    await this.rentalRepo.update(rentalId, { autopayId: data.autopayId });
    return this.rentalRepo.findOne({ where: { id: rentalId } });
  }

  async requestReturn(rentalId: string): Promise<Rental> {
    await this.rentalRepo.update(rentalId, { status: RentalStatus.RETURN_REQUESTED });
    return this.rentalRepo.findOne({ where: { id: rentalId } });
  }

  async extend(rentalId: string, months: number): Promise<Rental> {
    const rental = await this.rentalRepo.findOne({ where: { id: rentalId } });
    if (!rental) throw new NotFoundException('Rental not found');
    const newDueDate = new Date(rental.nextDueDate);
    newDueDate.setMonth(newDueDate.getMonth() + months);
    await this.rentalRepo.update(rentalId, { nextDueDate: newDueDate });
    return this.rentalRepo.findOne({ where: { id: rentalId } });
  }
}
