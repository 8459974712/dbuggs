import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Laptop, LaptopStatus } from '../../database/entities/laptop.entity';

const PUBLIC_FIELDS: (keyof Laptop)[] = [
  'id', 'serialNo', 'brand', 'model', 'processor', 'ram', 'storage', 'display', 'grade', 'status',
  'sellingPrice', 'rentalPrice', 'warrantyMonths', 'createdAt',
];
const VISIBLE = [LaptopStatus.AVAILABLE, LaptopStatus.RESERVED, LaptopStatus.SOLD];

@Injectable()
export class ProductsService {
  constructor(@InjectRepository(Laptop) private laptopRepo: Repository<Laptop>) {}

  async findAll(query: any): Promise<{ data: Laptop[]; total: number }> {
    const where: any = { status: LaptopStatus.AVAILABLE };
    if (query.brand) where.brand = query.brand;
    if (query.grade) where.grade = query.grade;
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
    const [data, total] = await this.laptopRepo.findAndCount({
      select: PUBLIC_FIELDS,
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { grade: 'ASC', sellingPrice: 'ASC' },
    });
    return { data, total };
  }

  async findOne(id: string): Promise<Laptop> {
    const unit = await this.laptopRepo.findOne({ select: PUBLIC_FIELDS, where: { id, status: In(VISIBLE) } });
    if (!unit) throw new NotFoundException('This laptop is no longer available');
    return unit;
  }

  async getRentalProducts(): Promise<Laptop[]> {
    return this.laptopRepo.find({
      where: { status: LaptopStatus.AVAILABLE },
      select: ['id', 'brand', 'model', 'grade', 'processor', 'ram', 'storage', 'rentalPrice'],
    });
  }
}
