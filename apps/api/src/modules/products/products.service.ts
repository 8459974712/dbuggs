import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between } from 'typeorm';
import { Laptop, LaptopStatus } from '../../database/entities/laptop.entity';

@Injectable()
export class ProductsService {
  constructor(@InjectRepository(Laptop) private laptopRepo: Repository<Laptop>) {}

  async findAll(query: any): Promise<{ data: Laptop[]; total: number }> {
    const where: any = { status: LaptopStatus.AVAILABLE };
    if (query.brand) where.brand = query.brand;
    if (query.grade) where.grade = query.grade;
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const [data, total] = await this.laptopRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { grade: 'ASC', sellingPrice: 'ASC' },
    });
    return { data, total };
  }

  async findOne(id: string): Promise<Laptop> {
    return this.laptopRepo.findOne({ where: { id } });
  }

  async getRentalProducts(): Promise<Laptop[]> {
    return this.laptopRepo.find({
      where: { status: LaptopStatus.AVAILABLE },
      select: ['id', 'brand', 'model', 'grade', 'processor', 'ram', 'storage', 'rentalPrice'],
    });
  }
}
