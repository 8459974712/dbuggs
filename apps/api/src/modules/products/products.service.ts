import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Laptop, LaptopStatus } from '../../database/entities/laptop.entity';

const PUBLIC_FIELDS: (keyof Laptop)[] = [
  'id', 'serialNo', 'brand', 'model', 'processor', 'ram', 'storage', 'display', 'grade', 'status',
  'sellingPrice', 'rentalPrice', 'warrantyMonths', 'createdAt',
];
const VISIBLE = [LaptopStatus.AVAILABLE, LaptopStatus.RESERVED, LaptopStatus.SOLD];
const SITE_URL = 'http://200.234.39.146:5001';

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

  // ── #29 COMPARE ──
  async compare(ids: string[]): Promise<Laptop[]> {
    if (!ids || ids.length < 2 || ids.length > 4) throw new BadRequestException('Select 2 to 4 products to compare.');
    const unique = [...new Set(ids)];
    const laptops = await this.laptopRepo.find({
      select: PUBLIC_FIELDS,
      where: { id: In(unique), status: In(VISIBLE) },
    });
    if (laptops.length < 2) throw new BadRequestException('At least 2 valid products are required to compare.');
    return unique.map(id => laptops.find(l => l.id === id)).filter(Boolean);
  }

  // ── #31 SEO: Brands ──
  async getBrands(): Promise<string[]> {
    const rows = await this.laptopRepo
      .createQueryBuilder('l')
      .select('DISTINCT l.brand', 'brand')
      .where('l.status = :s', { s: LaptopStatus.AVAILABLE })
      .orderBy('l.brand', 'ASC')
      .getRawMany();
    return rows.map(r => r.brand);
  }

  // ── #31 SEO: Sitemap ──
  async generateSitemap(): Promise<string> {
    const laptops = await this.laptopRepo.find({
      select: ['id', 'updatedAt'],
      where: { status: LaptopStatus.AVAILABLE },
      order: { updatedAt: 'DESC' },
    });
    const urls = laptops.map(l => `  <url>
    <loc>${SITE_URL}/product.html?id=${l.id}</loc>
    <lastmod>${l.updatedAt.toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
  </url>`).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${urls}
</urlset>`;
  }
}
