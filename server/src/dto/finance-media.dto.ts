import { IsString, IsOptional, IsInt, Min, IsNumber, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAccountDto {
  @ApiProperty({ example: '丰晟达公账' })
  @IsString() name: string;

  @ApiProperty({ enum: ['public', 'wechat', 'alipay', 'cash', 'other'] })
  @IsIn(['public', 'wechat', 'alipay', 'cash', 'other'])
  type: string;

  @ApiPropertyOptional({ example: true, description: '是否公账' })
  @IsOptional() is_company?: boolean;

  @ApiPropertyOptional({ enum: ['active', 'frozen'] })
  @IsOptional() @IsIn(['active', 'frozen'])
  status?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional() @IsNumber() @Min(0) opening_balance?: number;
}

export class UpdateAccountDto extends CreateAccountDto {}

export class CreateTransactionDto {
  @ApiProperty({ example: 1, description: '账户 ID' })
  @IsInt() @Min(1) account_id: number;

  @ApiProperty({ enum: ['in', 'out'] })
  @IsIn(['in', 'out'])
  direction: 'in' | 'out';

  @ApiProperty({ example: 1000 })
  @IsNumber() @Min(0.01) amount: number;

  @ApiProperty({ enum: ['purchase', 'sale', 'commission', 'manual'] })
  @IsIn(['purchase', 'sale', 'commission', 'manual'])
  source_type: 'purchase' | 'sale' | 'commission' | 'manual';

  @ApiPropertyOptional() @IsOptional() @IsInt() ref_order_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() ref_order_no?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() counter_party?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() operator_id?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() remark?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() receipt_url?: string;
}

export class CreateMediaDto {
  @ApiPropertyOptional({ example: 1, description: '产品 ID' })
  @IsOptional() @IsInt() product_id?: number;

  @ApiProperty({ enum: ['image', 'video'] })
  @IsIn(['image', 'video'])
  type: 'image' | 'video';

  @ApiProperty({ example: '/uploads/1700000000.jpg' })
  @IsString() file_path: string;

  @ApiPropertyOptional() @IsOptional() @IsString() thumb?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() uploader_id?: number;
}
