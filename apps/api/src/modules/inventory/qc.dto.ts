import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNumber, IsObject, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class SubmitQcDto {
  @IsObject()
  checklist: Record<string, boolean>;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  batteryPercent?: number;

  @IsOptional()
  @IsString()
  @Length(0, 300)
  partsReplaced?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  adminNotes?: string;

  @IsOptional()
  @IsIn(['A+', 'A', 'B', 'C'])
  grade?: string;

  @IsOptional()
  @IsBoolean()
  makeAvailable?: boolean;
}
