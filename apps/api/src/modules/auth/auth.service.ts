import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as bcrypt from 'bcryptjs';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private jwtService: JwtService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async sendOtp(phone: string): Promise<{ message: string }> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await this.cacheManager.set(`otp:${phone}`, otp, 300);
    // TODO: Send via SMS API (MSG91 / Twilio)
    console.log(`OTP for ${phone}: ${otp}`); // Remove in production
    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(phone: string, otp: string): Promise<{ accessToken: string; user: Partial<User> }> {
    const cachedOtp = await this.cacheManager.get<string>(`otp:${phone}`);
    if (!cachedOtp || cachedOtp !== otp) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }
    await this.cacheManager.del(`otp:${phone}`);

    let user = await this.userRepo.findOne({ where: { phone } });
    if (!user) {
      user = this.userRepo.create({ phone });
      await this.userRepo.save(user);
    }

    const payload = { sub: user.id, phone: user.phone, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const { ...userData } = user;
    return { accessToken, user: userData };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const accessToken = this.jwtService.sign({ sub: payload.sub, phone: payload.phone, role: payload.role });
      return { accessToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateUser(userId: string): Promise<User> {
    return this.userRepo.findOne({ where: { id: userId } });
  }

  async adminLogin(email: string, password: string): Promise<{ accessToken: string; user: Partial<User> }> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!['admin', 'super_admin'].includes(user.role)) {
      throw new UnauthorizedException('Not an admin account');
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload = { sub: user.id, phone: user.phone, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const { password: _pw, ...userData } = user;
    return { accessToken, user: userData };
  }

  async login(email: string, password: string): Promise<{ accessToken: string; user: Partial<User> }> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload = { sub: user.id, phone: user.phone, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const { password: _pw, ...userData } = user;
    return { accessToken, user: userData };
  }

  async setPassword(userId: string, password: string): Promise<{ message: string }> {
    const hash = await bcrypt.hash(password, 10);
    await this.userRepo.update(userId, { password: hash });
    return { message: 'Password set successfully' };
  }

  async signup(data: { name: string; email: string; phone: string; password: string; role?: string }): Promise<{ accessToken: string; user: Partial<User> }> {
    const existing = await this.userRepo.findOne({ where: [{ email: data.email }, { phone: data.phone }] });
    if (existing) {
      throw new BadRequestException('An account with this email or phone already exists');
    }
    const hash = await bcrypt.hash(data.password, 10);
    const role = ['b2b', 'dealer'].includes(data.role) ? data.role : 'b2c';
    const user = this.userRepo.create({
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: hash,
      role: role as any,
    });
    await this.userRepo.save(user);
    const payload = { sub: user.id, phone: user.phone, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const { password: _pw, ...userData } = user;
    return { accessToken, user: userData };
  }
}
