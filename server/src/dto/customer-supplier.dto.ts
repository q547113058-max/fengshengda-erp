import { IsString, IsOptional, IsIn, IsInt, Min, IsNumber, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupplierDto {
  @ApiProperty({ example: '山东聊城福源禽业' })
  @IsString() name: string;

  @ApiPropertyOptional() @IsOptional() @IsString() contact_name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;

  @ApiPropertyOptional({ enum: ['现款', '月结30天', '月结45天', '货到付款'] })
  @IsOptional() @IsIn(['现款', '月结30天', '月结45天', '货到付款'])
  settle_type?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() remark?: string;
}

export class UpdateSupplierDto extends CreateSupplierDto {}

export class CreateCustomerDto {
  @ApiProperty({ example: '佛山食杂批发部' })
  @IsString() name: string;

  @ApiPropertyOptional() @IsOptional() @IsString() contact_name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;

  @ApiProperty({ enum: ['加工厂', '批发商', '商超', '餐饮'] })
  @IsIn(['加工厂', '批发商', '商超', '餐饮'])
  type: string;

  @ApiProperty({ enum: ['国企', '个体户'] })
  @IsIn(['国企', '个体户'])
  nature: string;

  @ApiProperty({ example: 4, description: '业务员 user_id' })
  @IsInt() @Min(1)
  sales_user_id: number;

  @ApiPropertyOptional() @IsOptional() @IsString() remark?: string;
}

export class UpdateCustomerDto extends CreateCustomerDto {}

export class CreateUserDto {
  @ApiProperty({ example: 'newstaff' })
  @IsString() username: string;

  @ApiProperty({ example: '张三' })
  @IsString() full_name: string;

  @ApiPropertyOptional({ example: '123456' })
  @IsOptional() @IsString() password_hash?: string;

  @ApiProperty({ enum: ['boss', 'finance', 'warehouse', 'sales'] })
  @IsIn(['boss', 'finance', 'warehouse', 'sales'])
  role: string;

  @ApiPropertyOptional({ example: 0.03 })
  @IsOptional() @IsNumber() @Min(0)
  default_commission_rate?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;

  @ApiPropertyOptional({ enum: ['active', 'disabled'] })
  @IsOptional() @IsIn(['active', 'disabled'])
  status?: string;
}
