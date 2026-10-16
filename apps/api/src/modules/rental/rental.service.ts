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

  async submitKyc(userId: string, data: any): Promise<KycDocument> {
    const doc = this.kycRepo.create({ ...data, userId, status: KycDocStatus.PENDING });
    return this.kycRepo.save(doc) as unknown as Promise<KycDocument>;
  }

  async approveKyc(kycId: string, reviewedBy: string): Promise<KycDocument> {
    await this.kycRepo.update(kycId, { status: KycDocStatus.APPROVED, reviewedBy });
    const doc = await this.kycRepo.findOne({ where: { id: kycId } });
    if (doc) {
      const pending = await this.kycRepo.count({ where: { userId: doc.userId, status: KycDocStatus.PENDING } });
      if (pending === 0) {
        await this.rentalRepo.update(
          { userId: doc.userId, status: RentalStatus.KYC_PENDING },
          { status: RentalStatus.DEPOSIT_PENDING },
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

    const rental = this.rentalRepo.create({
      userId,
      laptopId: data.laptopId,
      monthlyRent: data.monthlyAmount || 0,
      depositAmount: data.depositAmount || 0,
      status: RentalStatus.KYC_PENDING,
    });
    const savedRental = await this.rentalRepo.save(rental);

    return {
      ...savedRental,
      kycStatus: 'pending',
      kycDocsCount: savedDocs.length,
      message: 'KYC documents submitted for review. Rental will be activated after approval.',
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

  async findByUser(userId: string): Promise<Rental[]> {
    return this.rentalRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async findAll(): Promise<Rental[]> {
    return this.rentalRepo.find({ order: { createdAt: 'DESC' } });
  }

  async recordDeposit(rentalId: string, data: any): Promise<Rental> {
    const startDate = new Date();
    const nextDueDate = new Date(startDate);
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    await this.rentalRepo.update(rentalId, {
      status: RentalStatus.ACTIVE,
      startDate,
      nextDueDate,
    });
    const rental = await this.rentalRepo.findOne({ where: { id: rentalId } });
    await this.laptopRepo.update(rental.laptopId, { status: LaptopStatus.RENTED });
    return rental;
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
