import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
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
    console.log(`OTP for ${phone}: ${otp}`);
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
    return { accessToken, user: this.safe(user) };
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

  async adminLogin(email: string, password: string): Promise<{ accessToken?: string; requires2fa?: boolean; tempToken?: string; user: Partial<User> }> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user || !user.password) throw new UnauthorizedException('Invalid credentials');
    if (!['admin', 'super_admin'].includes(user.role)) throw new UnauthorizedException('Not an admin account');
    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new UnauthorizedException('Invalid credentials');

    if (user.twoFactorSecret) {
      const tempToken = this.jwtService.sign({ sub: user.id, pending2fa: true }, { expiresIn: '5m' });
      return { requires2fa: true, tempToken, user: this.safe(user) };
    }

    const accessToken = this.jwtService.sign({ sub: user.id, phone: user.phone, role: user.role });
    return { accessToken, user: this.safe(user) };
  }

  // ── #42 2FA: verify TOTP code after password ──
  async verify2fa(tempToken: string, code: string): Promise<{ accessToken: string; user: Partial<User> }> {
    let payload: any;
    try { payload = this.jwtService.verify(tempToken); } catch { throw new UnauthorizedException('Session expired, please login again.'); }
    if (!payload.pending2fa) throw new BadRequestException('Invalid token');
    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user || !user.twoFactorSecret) throw new BadRequestException('2FA not set up');
    if (!this.verifyTotp(user.twoFactorSecret, code)) throw new UnauthorizedException('Invalid 2FA code');
    const accessToken = this.jwtService.sign({ sub: user.id, phone: user.phone, role: user.role });
    return { accessToken, user: this.safe(user) };
  }

  // ── #42 2FA: setup ──
  async setup2fa(userId: string): Promise<{ secret: string; otpauth: string }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (!['admin', 'super_admin'].includes(user.role)) throw new BadRequestException('2FA is only for admin accounts');
    const secret = crypto.randomBytes(20).toString('hex').slice(0, 20).toUpperCase();
    const b32 = this.hexToBase32(secret);
    const name = encodeURIComponent(user.email || user.phone);
    return { secret: b32, otpauth: `otpauth://totp/dbuggs:${name}?secret=${b32}&issuer=dbuggs&digits=6&period=30` };
  }

  async confirm2fa(userId: string, secret: string, code: string): Promise<{ message: string }> {
    if (!this.verifyTotp(secret, code)) throw new BadRequestException('Invalid code. Please scan the QR again and enter the current code.');
    await this.userRepo.update(userId, { twoFactorSecret: secret });
    return { message: '2FA enabled successfully' };
  }

  async disable2fa(userId: string, code: string): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user?.twoFactorSecret) throw new BadRequestException('2FA is not enabled');
    if (!this.verifyTotp(user.twoFactorSecret, code)) throw new UnauthorizedException('Invalid 2FA code');
    await this.userRepo.update(userId, { twoFactorSecret: null });
    return { message: '2FA disabled' };
  }

  // TOTP implementation (RFC 6238, SHA-1, 6 digits, 30s step)
  private verifyTotp(secret: string, code: string): boolean {
    const time = Math.floor(Date.now() / 1000 / 30);
    for (let i = -1; i <= 1; i++) {
      if (this.generateTotp(secret, time + i) === code) return true;
    }
    return false;
  }

  private generateTotp(secret: string, counter: number): string {
    const key = Buffer.from(this.base32ToHex(secret), 'hex');
    const buf = Buffer.alloc(8);
    buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
    buf.writeUInt32BE(counter & 0xFFFFFFFF, 4);
    const hmac = crypto.createHmac('sha1', key).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const otp = ((hmac[offset] & 0x7f) << 24 | hmac[offset + 1] << 16 | hmac[offset + 2] << 8 | hmac[offset + 3]) % 1000000;
    return otp.toString().padStart(6, '0');
  }

  private hexToBase32(hex: string): string {
    const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    for (const c of hex) bits += parseInt(c, 16).toString(2).padStart(4, '0');
    let out = '';
    for (let i = 0; i < bits.length; i += 5) out += alpha[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)];
    return out;
  }

  private base32ToHex(b32: string): string {
    const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    for (const c of b32.toUpperCase()) {
      const idx = alpha.indexOf(c);
      if (idx >= 0) bits += idx.toString(2).padStart(5, '0');
    }
    let hex = '';
    for (let i = 0; i + 4 <= bits.length; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
    return hex;
  }

  async login(email: string, password: string): Promise<{ accessToken: string; user: Partial<User> }> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user || !user.password) throw new UnauthorizedException('Invalid credentials');
    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new UnauthorizedException('Invalid credentials');
    const accessToken = this.jwtService.sign({ sub: user.id, phone: user.phone, role: user.role });
    return { accessToken, user: this.safe(user) };
  }

  async setPassword(userId: string, password: string): Promise<{ message: string }> {
    const hash = await bcrypt.hash(password, 10);
    await this.userRepo.update(userId, { password: hash });
    return { message: 'Password set successfully' };
  }

  async signup(data: { name: string; email: string; phone: string; password: string; role?: string }): Promise<{ accessToken: string; user: Partial<User> }> {
    const existing = await this.userRepo.findOne({ where: [{ email: data.email }, { phone: data.phone }] });
    if (existing) throw new BadRequestException('An account with this email or phone already exists');
    const hash = await bcrypt.hash(data.password, 10);
    const role = ['b2b', 'dealer'].includes(data.role) ? data.role : 'b2c';
    const user = this.userRepo.create({ name: data.name, email: data.email, phone: data.phone, password: hash, role: role as any });
    await this.userRepo.save(user);
    const accessToken = this.jwtService.sign({ sub: user.id, phone: user.phone, role: user.role });
    return { accessToken, user: this.safe(user) };
  }

  private safe(user: User): Partial<User> {
    const { password, twoFactorSecret, ...safe } = user as any;
    return safe;
  }
}
