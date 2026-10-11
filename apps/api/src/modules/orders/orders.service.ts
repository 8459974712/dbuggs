import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus, OrderType } from '../../database/entities/order.entity';
import { Laptop, LaptopStatus } from '../../database/entities/laptop.entity';
import { v4 as uuid } from 'uuid';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(Laptop) private laptopRepo: Repository<Laptop>,
  ) {}

  async create(data: any): Promise<Order> {
    const order = this.orderRepo.create({
      ...data,
      orderNumber: `ORD-${Date.now()}`,
      status: OrderStatus.PENDING,
    });
    await this.laptopRepo.update(data.laptopId, { status: LaptopStatus.RESERVED });
    return this.orderRepo.save(order) as unknown as Promise<Order>;
  }

  async findByUser(userId: string, query: any): Promise<Order[]> {
    return this.orderRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async findAll(query: any): Promise<{ data: Order[]; total: number }> {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    const [data, total] = await this.orderRepo.findAndCount({ where, order: { createdAt: 'DESC' } });
    return { data, total };
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(id: string, status: string): Promise<Order> {
    await this.orderRepo.update(id, { status: status as OrderStatus });
    return this.findOne(id);
  }

  async requestReturn(id: string, reason: string): Promise<Order> {
    return this.updateStatus(id, OrderStatus.RETURN_REQUESTED);
  }

  async raiseWarranty(id: string, data: any): Promise<{ message: string }> {
    // TODO: Create warranty ticket
    return { message: 'Warranty claim submitted successfully' };
  }
}
