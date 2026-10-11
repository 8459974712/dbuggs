import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Laptop, LaptopStatus } from '../../database/entities/laptop.entity';
import { LaptopQc } from '../../database/entities/laptop-qc.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Laptop) private laptopRepo: Repository<Laptop>,
    @InjectRepository(LaptopQc) private qcRepo: Repository<LaptopQc>,
  ) {}

  async addUnit(data: Partial<Laptop>): Promise<Laptop> {
    const unit = this.laptopRepo.create(data);
    return this.laptopRepo.save(unit);
  }

  async findAll(query: any): Promise<{ data: Laptop[]; total: number }> {
    const where: any = {};
    if (query.grade) where.grade = query.grade;
    if (query.status) where.status = query.status;
    if (query.warehouseId) where.warehouseId = query.warehouseId;
    const [data, total] = await this.laptopRepo.findAndCount({ where, order: { createdAt: 'DESC' } });
    return { data, total };
  }

  async findOne(id: string): Promise<Laptop> {
    const unit = await this.laptopRepo.findOne({ where: { id } });
    if (!unit) throw new NotFoundException('Laptop unit not found');
    return unit;
  }

  async findBySerial(serialNo: string): Promise<Laptop> {
    const unit = await this.laptopRepo.findOne({ where: { serialNo } });
    if (!unit) throw new NotFoundException('Serial number not found');
    return unit;
  }

  async submitQc(laptopId: string, data: any): Promise<LaptopQc> {
    const qc = this.qcRepo.create({ ...data, laptopId });
    await this.laptopRepo.update(laptopId, { status: LaptopStatus.IN_QC });
    return this.qcRepo.save(qc) as unknown as Promise<LaptopQc>;
  }

  async assignGrade(laptopId: string, grade: string, notes?: string): Promise<Laptop> {
    await this.laptopRepo.update(laptopId, { grade: grade as any, status: LaptopStatus.AVAILABLE });
    await this.qcRepo.update({ laptopId }, { gradedAs: grade, adminNotes: notes });
    return this.findOne(laptopId);
  }

  async updateStatus(laptopId: string, status: string): Promise<Laptop> {
    await this.laptopRepo.update(laptopId, { status: status as LaptopStatus });
    return this.findOne(laptopId);
  }

  async getAvailableUnits(): Promise<Laptop[]> {
    return this.laptopRepo.find({ where: { status: LaptopStatus.AVAILABLE } });
  }
}
