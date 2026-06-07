import { IsString, IsOptional, IsInt, Min, IsNumber, IsDateString, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePurchaseDto {
  @ApiProperty({ example: 1, description: '供应商 ID' })
  @IsInt() @Min(1) supplier_id: number;

  @ApiProperty({ example: 1, description: '产品 ID' })
  @IsInt() @Min(1) product_id: number;

  @ApiProperty({ example: 100, description: '数量（箱）' })
  @IsInt() @Min(1) qty: number;

  @ApiProperty({ example: 14.5, description: '采购单价' })
  @IsNumber() @Min(0) cost_price: number;

  @ApiPropertyOptional({ example: '2026-06-05' })
  @IsOptional() @IsDateString()
  purchase_date?: string;

  @ApiPropertyOptional({ example: 1000, description: '已付金额' })
  @IsOptional() @IsNumber() @Min(0) paid_amount?: number;

  @ApiPropertyOptional({ example: 1, description: '付款账户 ID' })
  @IsOptional() @IsInt() account_id?: number;

  @ApiPropertyOptional({ example: 1, description: '创建人 user_id' })
  @IsOptional() @IsInt() created_by?: number;

  @ApiPropertyOptional({ example: '佛山冷库A' })
  @IsOptional() @IsString() warehouse?: string;

  @ApiPropertyOptional({ example: '黄仓管' })
  @IsOptional() @IsString() holder?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() remark?: string;
}

export class UpdatePurchaseDto {
  @IsOptional() @IsInt() supplier_id?: number;
  @IsOptional() @IsInt() product_id?: number;
  @IsOptional() @IsInt() @Min(1) qty?: number;
  @IsOptional() @IsNumber() @Min(0) cost_price?: number;
  @IsOptional() @IsDateString() purchase_date?: string;
  @IsOptional() @IsNumber() @Min(0) paid_amount?: number;
  @IsOptional() @IsString() warehouse?: string;
  @IsOptional() @IsString() holder?: string;
  @IsOptional() @IsString() remark?: string;
}

export class PayPurchaseDto {
  @ApiProperty({ example: 1, description: '付款账户 ID' })
  @IsInt() account_id: number;

  @ApiProperty({ example: 500 })
  @IsNumber() @Min(0.01) amount: number;

  @ApiPropertyOptional({ example: 2, description: '操作人 user_id' })
  @IsOptional() @IsInt() operator_id?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() counter_party?: string;
}

export class CreateSalesDto {
  @ApiProperty({ example: 1, description: '客户 ID' })
  @IsInt() @Min(1) customer_id: number;

  @ApiProperty({ example: 4, description: '业务员 user_id' })
  @IsInt() @Min(1) sales_user_id: number;

  @ApiProperty({ example: 1, description: '产品 ID' })
  @IsInt() @Min(1) product_id: number;

  @ApiProperty({ example: 1, description: '库存批次 ID' })
  @IsInt() @Min(1) batch_id: number;

  @ApiProperty({ example: 20, description: '数量（箱）' })
  @IsInt() @Min(1) qty: number;

  @ApiProperty({ example: 23.0 })
  @IsNumber() @Min(0) sale_price: number;

  @ApiPropertyOptional({ example: 1, description: '税率 1 或 9' })
  @IsOptional() @IsIn([1, 9]) tax_rate?: 1 | 9;

  @ApiPropertyOptional({ example: 3, description: '佣金比例 %' })
  @IsOptional() @IsNumber() @Min(0) commission_rate?: number;

  @ApiPropertyOptional({ example: '2026-06-05' })
  @IsOptional() @IsDateString() sale_date?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional() @IsNumber() @Min(0) received_amount?: number;

  @ApiPropertyOptional({ example: 1, description: '收款账户 ID' })
  @IsOptional() @IsInt() account_id?: number;

  @ApiPropertyOptional({ example: 2, description: '操作人 user_id' })
  @IsOptional() @IsInt() operator_id?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() counter_party?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() remark?: string;
}

export class UpdateSalesDto {
  @IsOptional() @IsInt() customer_id?: number;
  @IsOptional() @IsInt() sales_user_id?: number;
  @IsOptional() @IsInt() product_id?: number;
  @IsOptional() @IsInt() batch_id?: number;
  @IsOptional() @IsInt() @Min(1) qty?: number;
  @IsOptional() @IsNumber() @Min(0) sale_price?: number;
  @IsOptional() @IsIn([1, 9]) tax_rate?: 1 | 9;
  @IsOptional() @IsNumber() @Min(0) commission_rate?: number;
  @IsOptional() @IsDateString() sale_date?: string;
  @IsOptional() @IsNumber() @Min(0) received_amount?: number;
  @IsOptional() @IsString() remark?: string;
}

export class ReceiveSaleDto {
  @ApiProperty({ example: 1, description: '收款账户 ID' })
  @IsInt() account_id: number;

  @ApiProperty({ example: 460 })
  @IsNumber() @Min(0.01) amount: number;

  @ApiPropertyOptional() @IsOptional() @IsString() counter_party?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() operator_id?: number;
}

export class SettleCommissionDto {
  @ApiProperty({ example: 1, description: '付款账户 ID' })
  @IsInt() account_id: number;

  @ApiPropertyOptional() @IsOptional() @IsString() counter_party?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() operator_id?: number;
}

export class CreateMovementDto {
  @ApiProperty({ example: 1, description: '批次 ID' })
  @IsInt() @Min(1) batch_id: number;

  @ApiProperty({ enum: ['in', 'out', 'transfer', 'loss', 'return'] })
  @IsIn(['in', 'out', 'transfer', 'loss', 'return'])
  type: 'in' | 'out' | 'transfer' | 'loss' | 'return';

  @ApiProperty({ example: 10, description: '数量（箱）' })
  @IsInt() @Min(1) qty: number;

  @ApiPropertyOptional() @IsOptional() @IsString() operator?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() to_holder?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ref_order_no?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() remark?: string;
}
