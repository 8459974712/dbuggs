import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private userRepo: Repository<User>) {}

  async update(id: string, data: Partial<User>): Promise<User> {
    await this.userRepo.update(id, data);
    return this.userRepo.findOne({ where: { id } });
  }

  async updateFcmToken(id: string, token: string): Promise<void> {
    await this.userRepo.update(id, { fcmToken: token });
  }
}
