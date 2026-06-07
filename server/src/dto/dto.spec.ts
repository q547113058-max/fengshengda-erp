// DTO 验证单元测试 — 用 class-validator 的 validate() 跑全 schema
import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateProductDto, ProductPriceDto } from '../dto/product.dto';
import { CreatePurchaseDto, CreateSalesDto, CreateMovementDto, PayPurchaseDto, ReceiveSaleDto } from '../dto/purchase-sales.dto';
import { CreateCustomerDto, CreateSupplierDto } from '../dto/customer-supplier.dto';
import { CreateAccountDto, CreateTransactionDto } from '../dto/finance-media.dto';

const toInstance = <T>(cls: new () => T, obj: object) =>
  plainToInstance(cls, obj, { enableImplicitConversion: true });

describe('ProductPriceDto', () => {
  it('1% + 9% 双票价都通过', async () => {
    for (const r of [1, 9]) {
      const errors = await validate(toInstance(ProductPriceDto, { tax_rate: r, price: 18.5 }));
      expect(errors).toHaveLength(0);
    }
  });
  it('税率非法 (5) 应被拒', async () => {
    const errors = await validate(toInstance(ProductPriceDto, { tax_rate: 5, price: 10 }));
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('tax_rate');
  });
  it('负价应被拒', async () => {
    const errors = await validate(toInstance(ProductPriceDto, { tax_rate: 1, price: -1 }));
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('CreateProductDto', () => {
  it('完整合法对象通过', async () => {
    const errors = await validate(toInstance(CreateProductDto, {
      category: '卤鸡爪', origin: '山东', factory_code: 'JZ-LJ-001',
      spec: '30g/袋×50袋/箱', grade: 'A级', qty_per_unit: 50,
      goods_location: '佛山冷库', remark: '袋装卤味',
      prices: [{ tax_rate: 1, price: 18.5 }, { tax_rate: 9, price: 20.5 }],
    }));
    expect(errors).toHaveLength(0);
  });
  it('缺必填被拒', async () => {
    const errors = await validate(toInstance(CreateProductDto, { origin: 'x' }));
    expect(errors.map(e => e.property).sort()).toEqual(['category', 'factory_code', 'spec']);
  });
  it('价格数组里有非法税率被拒', async () => {
    const errors = await validate(toInstance(CreateProductDto, {
      category: 'x', origin: 'x', factory_code: 'x', spec: 'x',
      prices: [{ tax_rate: 5, price: 1 }],
    }));
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('prices');
  });
});

describe('CreatePurchaseDto', () => {
  it('合法对象通过', async () => {
    const errors = await validate(toInstance(CreatePurchaseDto, {
      supplier_id: 1, product_id: 1, qty: 100, cost_price: 14.5,
      purchase_date: '2026-06-05', paid_amount: 1000, account_id: 1, warehouse: '佛山冷库A', holder: '黄仓管',
    }));
    expect(errors).toHaveLength(0);
  });
  it('qty=0 被拒', async () => {
    const errors = await validate(toInstance(CreatePurchaseDto, { supplier_id: 1, product_id: 1, qty: 0, cost_price: 1 }));
    expect(errors.length).toBeGreaterThan(0);
  });
  it('purchase_date 非日期格式被拒', async () => {
    const errors = await validate(toInstance(CreatePurchaseDto, {
      supplier_id: 1, product_id: 1, qty: 1, cost_price: 1, purchase_date: 'not-a-date',
    }));
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('PayPurchaseDto', () => {
  it('合法付款通过', async () => {
    const errors = await validate(toInstance(PayPurchaseDto, { account_id: 1, amount: 500 }));
    expect(errors).toHaveLength(0);
  });
  it('amount < 0.01 被拒', async () => {
    const errors = await validate(toInstance(PayPurchaseDto, { account_id: 1, amount: 0 }));
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('CreateSalesDto', () => {
  it('完整合法销售单通过', async () => {
    const errors = await validate(toInstance(CreateSalesDto, {
      customer_id: 1, sales_user_id: 4, product_id: 1, batch_id: 1,
      qty: 20, sale_price: 23, tax_rate: 1, commission_rate: 3, sale_date: '2026-06-05',
    }));
    expect(errors).toHaveLength(0);
  });
  it('税率非法 (13) 被拒', async () => {
    const errors = await validate(toInstance(CreateSalesDto, {
      customer_id: 1, sales_user_id: 4, product_id: 1, batch_id: 1, qty: 1, sale_price: 1, tax_rate: 13,
    }));
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('tax_rate');
  });
});

describe('ReceiveSaleDto', () => {
  it('合法收款通过', async () => {
    const errors = await validate(toInstance(ReceiveSaleDto, { account_id: 1, amount: 460 }));
    expect(errors).toHaveLength(0);
  });
});

describe('CreateCustomerDto', () => {
  it('完整合法客户通过', async () => {
    const errors = await validate(toInstance(CreateCustomerDto, {
      name: '佛山食杂', type: '批发商', nature: '个体户', sales_user_id: 4,
    }));
    expect(errors).toHaveLength(0);
  });
  it('type 不在枚举被拒', async () => {
    const errors = await validate(toInstance(CreateCustomerDto, { name: 'x', type: '违法', nature: '个体户', sales_user_id: 4 }));
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('CreateSupplierDto', () => {
  it('合法供应商通过', async () => {
    const errors = await validate(toInstance(CreateSupplierDto, { name: '山东聊城福源禽业', settle_type: '月结30天' }));
    expect(errors).toHaveLength(0);
  });
  it('结款方式非法被拒', async () => {
    const errors = await validate(toInstance(CreateSupplierDto, { name: 'x', settle_type: 'NOPE' }));
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('CreateMovementDto', () => {
  it('合法入库通过', async () => {
    const errors = await validate(toInstance(CreateMovementDto, { batch_id: 1, type: 'in', qty: 10 }));
    expect(errors).toHaveLength(0);
  });
  it('type 非法被拒', async () => {
    const errors = await validate(toInstance(CreateMovementDto, { batch_id: 1, type: 'junk', qty: 1 }));
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('CreateAccountDto', () => {
  it('合法账户通过', async () => {
    const errors = await validate(toInstance(CreateAccountDto, { name: '丰晟达公账', type: 'public', is_company: true }));
    expect(errors).toHaveLength(0);
  });
});

describe('CreateTransactionDto', () => {
  it('合法财务流水通过', async () => {
    const errors = await validate(toInstance(CreateTransactionDto, {
      account_id: 1, direction: 'out', amount: 1000, source_type: 'purchase',
    }));
    expect(errors).toHaveLength(0);
  });
  it('source_type 非法被拒', async () => {
    const errors = await validate(toInstance(CreateTransactionDto, {
      account_id: 1, direction: 'out', amount: 1, source_type: 'bitcoin',
    }));
    expect(errors.length).toBeGreaterThan(0);
  });
});
