import { IsString, IsOptional, IsInt, Min, IsArray, ValidateNested, IsNumber, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductPriceDto {
  @ApiProperty({ example: 1, description: '税率 1 或 9' })
  @IsIn([1, 9], { message: '税率只能 1 或 9' })
  tax_rate: 1 | 9;

  @ApiProperty({ example: 18.8 })
  @IsNumber() @Min(0)
  price: number;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional() @IsString()
  effective_from?: string;
}

export class CreateProductDto {
  @ApiProperty({ example: '卤鸡爪' })
  @IsString() category: string;

  @ApiProperty({ example: '山东聊城' })
  @IsString() origin: string;

  @ApiProperty({ example: 'JZ-LJ-001' })
  @IsString() factory_code: string;

  @ApiProperty({ example: '30g/袋×50袋/箱' })
  @IsString() spec: string;

  @ApiPropertyOptional({ example: 'A级' })
  @IsOptional() @IsString() grade?: string;

  @ApiPropertyOptional({ example: 50, default: 1 })
  @IsOptional() @IsInt() @Min(1) qty_per_unit?: number;

  @ApiPropertyOptional({ example: '佛山冷库A' })
  @IsOptional() @IsString() goods_location?: string;

  @ApiPropertyOptional({ example: '袋装卤味，线下主力' })
  @IsOptional() @IsString() remark?: string;

  @ApiPropertyOptional({ type: [ProductPriceDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProductPriceDto)
  prices?: ProductPriceDto[];
}

export class UpdateProductDto {
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() origin?: string;
  @IsOptional() @IsString() factory_code?: string;
  @IsOptional() @IsString() spec?: string;
  @IsOptional() @IsString() grade?: string;
  @IsOptional() @IsInt() @Min(1) qty_per_unit?: number;
  @IsOptional() @IsString() goods_location?: string;
  @IsOptional() @IsString() remark?: string;
}

export class UpdatePriceDto {
  @IsOptional() @IsIn([1, 9]) tax_rate?: 1 | 9;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsString() effective_from?: string;
}
