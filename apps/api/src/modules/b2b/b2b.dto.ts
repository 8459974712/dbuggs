import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, Length, Max, Min, ValidateNested,
} from 'class-validator';

export class RegisterB2bDto {
  @IsString()
  @Length(2, 150)
  companyName: string;

  @IsString()
  @Length(15, 15)
  gstin: string;

  @IsOptional()
  @IsString()
  @Length(0, 300)
  address?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  city?: string;
}

export class ApproveB2bDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100000000)
  creditLimit: number;
}

export class VerifyGstinDto {
  @IsString()
  @Length(1, 20)
  gstin: string;
}

export class BulkLineDto {
  @IsString()
  @Length(1, 60)
  brand: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  model?: string;

  @IsOptional()
  @IsIn(['A+', 'A', 'B', 'C', ''])
  grade?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  qty: number;
}

export class BulkMatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => BulkLineDto)
  items: BulkLineDto[];
}

export class CreateRfqDto {
  @IsString()
  @Length(10, 3000)
  details: string;
}

export class QuoteItemDto {
  @IsString()
  @Length(1, 300)
  description: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  qty: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10000000)
  unitPrice: number;
}

export class QuoteRfqDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items: QuoteItemDto[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  validDays?: number;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  notes?: string;
}

export class RecordPaymentDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100000000)
  amount: number;

  @IsString()
  @Length(2, 100)
  reference: string;

  @IsOptional()
  @IsString()
  @Length(0, 300)
  note?: string;
}
