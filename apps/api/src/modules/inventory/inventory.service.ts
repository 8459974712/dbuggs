import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Laptop, LaptopGrade, LaptopStatus } from '../../database/entities/laptop.entity';
import { LaptopQc } from '../../database/entities/laptop-qc.entity';
import { SubmitQcDto } from './qc.dto';

const GRADES = Object.values(LaptopGrade) as string[];
const QC_EDITABLE = [LaptopStatus.IN_QC, LaptopStatus.AVAILABLE, LaptopStatus.REPAIR];

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Laptop) private laptopRepo: Repository<Laptop>,
    @InjectRepository(LaptopQc) private qcRepo: Repository<LaptopQc>,
    private dataSource: DataSource,
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

  qcHistory(laptopId: string): Promise<LaptopQc[]> {
    return this.qcRepo.find({ where: { laptopId }, order: { createdAt: 'DESC' } });
  }

  async submitQc(laptopId: string, dto: SubmitQcDto, technicianId: string) {
    const unit = await this.findOne(laptopId);
    if (!QC_EDITABLE.includes(unit.status)) {
      throw new BadRequestException(`This unit is ${unit.status} — QC can only be recorded for units in QC, repair or available stock.`);
    }
    const checklist: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(dto.checklist || {})) {
      const key = String(k).trim().slice(0, 80);
      if (key) checklist[key] = v === true;
    }
    if (!Object.keys(checklist).length) throw new BadRequestException('Add at least one checklist item.');
    return this.dataSource.transaction(async (m) => {
      const qc = await m.getRepository(LaptopQc).save(m.getRepository(LaptopQc).create({
        laptopId, technicianId, checklist,
        batteryPercent: dto.batteryPercent ?? null,
        partsReplaced: dto.partsReplaced?.trim() || null,
        adminNotes: dto.adminNotes?.trim() || null,
        gradedAs: dto.grade || null,
      }));
      const update: Partial<Laptop> = {};
      if (dto.grade) update.grade = dto.grade as LaptopGrade;
      update.status = dto.grade && dto.makeAvailable ? LaptopStatus.AVAILABLE
        : unit.status === LaptopStatus.AVAILABLE && !dto.grade ? LaptopStatus.IN_QC
        : unit.status === LaptopStatus.REPAIR ? LaptopStatus.IN_QC
        : unit.status;
      await m.getRepository(Laptop).update(laptopId, update);
      return { qc, unit: await m.getRepository(Laptop).findOne({ where: { id: laptopId } }) };
    });
  }

  async assignGrade(laptopId: string, grade: string, notes?: string): Promise<Laptop> {
    if (!GRADES.includes(grade)) throw new BadRequestException('Grade must be A+, A, B or C');
    const unit = await this.findOne(laptopId);
    if (!QC_EDITABLE.includes(unit.status)) throw new BadRequestException(`This unit is ${unit.status} and cannot be re-graded.`);
    await this.laptopRepo.update(laptopId, { grade: grade as LaptopGrade, status: LaptopStatus.AVAILABLE });
    const latest = await this.qcRepo.findOne({ where: { laptopId }, order: { createdAt: 'DESC' } });
    if (latest) await this.qcRepo.update(latest.id, { gradedAs: grade, ...(notes ? { adminNotes: notes } : {}) });
    return this.findOne(laptopId);
  }

  async updateStatus(laptopId: string, status: string): Promise<Laptop> {
    if (!Object.values(LaptopStatus).includes(status as LaptopStatus)) throw new BadRequestException('Unknown status');
    await this.laptopRepo.update(laptopId, { status: status as LaptopStatus });
    return this.findOne(laptopId);
  }

  async getAvailableUnits(): Promise<Laptop[]> {
    return this.laptopRepo.find({ where: { status: LaptopStatus.AVAILABLE } });
  }
}
