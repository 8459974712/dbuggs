import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rental, RentalStatus } from '../../database/entities/rental.entity';
import { KycDocument, KycDocStatus } from '../../database/entities/kyc-document.entity';
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
    return this.kycRepo.findOne({ where: { id: kycId } });
  }

  async rejectKyc(kycId: string, reason: string): Promise<KycDocument> {
    await this.kycRepo.update(kycId, { status: KycDocStatus.REJECTED, rejectionReason: reason });
    return this.kycRepo.findOne({ where: { id: kycId } });
  }

  async getKycQueue(): Promise<KycDocument[]> {
    return this.kycRepo.find({ where: { status: KycDocStatus.PENDING }, order: { createdAt: 'ASC' } });
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
