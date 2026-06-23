import { IsString, IsOptional, IsIn, IsInt, Min, IsBoolean } from 'class-validator';
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

  @ApiProperty({ enum: ['国企', '贸易商', '商超', '加工厂', '餐饮'] })
  @IsIn(['国企', '贸易商', '商超', '加工厂', '餐饮'])
  type: string;

  /** 新建时可选，默认为当前登录用户（后端自动设置） */
  @ApiPropertyOptional({ description: '所属业务员，新建时默认=当前登录用户', example: 4 })
  @IsOptional() @IsInt() @Min(1)
  sales_user_id?: number;

  @ApiPropertyOptional({ description: '共享给哪些业务员 ID 列表' })
  @IsOptional()
  @IsInt({ each: true })
  shared_to_user_ids?: number[];

  @ApiPropertyOptional() @IsOptional() @IsString() remark?: string;
}

// UpdateCustomerDto: all fields optional except name
export class UpdateCustomerDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contact_name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional({ enum: ['国企', '贸易商', '商超', '加工厂', '餐饮'] })
  @IsOptional() @IsIn(['国企', '贸易商', '商超', '加工厂', '餐饮'])
  type?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1)
  sales_user_id?: number;
  @ApiPropertyOptional({ description: '共享给哪些业务员 ID 列表' })
  @IsOptional()
  @IsInt({ each: true })
  shared_to_user_ids?: number[];
  @ApiPropertyOptional() @IsOptional() @IsString() remark?: string;
}
