// 库存批次更新 DTO — 严格只允许这几个字段
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, IsIn } from 'class-validator';

export class UpdateBatchDto {
  @ApiProperty({ example: '佛山冷库B', required: false })
  @IsOptional()
  @IsString()
  warehouse?: string;

  @ApiProperty({ example: '陈仓管', required: false })
  @IsOptional()
  @IsString()
  holder?: string;

  @ApiProperty({ example: 'in_stock', enum: ['in_stock', 'sold_out', 'transferred'], required: false })
  @IsOptional()
  @IsIn(['in_stock', 'sold_out', 'transferred'])
  status?: 'in_stock' | 'sold_out' | 'transferred';

  @ApiProperty({ example: 100, required: false, description: '剩余数量（手工调整时使用）' })
  @IsOptional()
  @IsInt()
  @Min(0)
  qty_remaining?: number;
}
