import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { UpdateMeDto } from './update-me.dto';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private userRepo: Repository<User>) {}

  async updateMe(id: string, dto: UpdateMeDto): Promise<Partial<User>> {
    const data: Partial<User> = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      if (await this.userRepo.findOne({ where: { email, id: Not(id) } })) throw new ConflictException('This email is already in use');
      data.email = email;
    }
    if (dto.phone !== undefined) {
      const phone = dto.phone.replace(/\D/g, '');
      if (await this.userRepo.findOne({ where: { phone, id: Not(id) } })) throw new ConflictException('This phone number is already in use');
      data.phone = phone;
    }
    if (Object.keys(data).length) await this.userRepo.update(id, data);
    const { password, ...safe } = await this.userRepo.findOne({ where: { id } });
    return safe;
  }

  async updateFcmToken(id: string, token: string): Promise<void> {
    await this.userRepo.update(id, { fcmToken: token });
  }
}
