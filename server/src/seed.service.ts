// 启动时自动种子数据：表为空时填入与原前端 seed.ts 相同的演示数据
import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from './entities/user.entity';
import { Product } from './entities/product.entity';
import { ProductPrice } from './entities/product-price.entity';
import { Supplier } from './entities/supplier.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { InventoryBatch } from './entities/inventory-batch.entity';
import { InventoryMovement } from './entities/inventory-movement.entity';
import { MediaAsset } from './entities/media-asset.entity';
import { Customer } from './entities/customer.entity';
import { SalesOrder } from './entities/sales-order.entity';
import { CommissionRecord } from './entities/commission-record.entity';
import { PaymentAccount } from './entities/payment-account.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Product) private products: Repository<Product>,
    @InjectRepository(ProductPrice) private prices: Repository<ProductPrice>,
    @InjectRepository(Supplier) private suppliers: Repository<Supplier>,
    @InjectRepository(PurchaseOrder) private purchaseOrders: Repository<PurchaseOrder>,
    @InjectRepository(InventoryBatch) private batches: Repository<InventoryBatch>,
    @InjectRepository(InventoryMovement) private movements: Repository<InventoryMovement>,
    @InjectRepository(MediaAsset) private media: Repository<MediaAsset>,
    @InjectRepository(Customer) private customers: Repository<Customer>,
    @InjectRepository(SalesOrder) private salesOrders: Repository<SalesOrder>,
    @InjectRepository(CommissionRecord) private commissions: Repository<CommissionRecord>,
    @InjectRepository(PaymentAccount) private accounts: Repository<PaymentAccount>,
    @InjectRepository(PaymentTransaction) private transactions: Repository<PaymentTransaction>,
  ) {}

  async onApplicationBootstrap() {
    const count = await this.users.count();
    if (count > 0) {
      this.logger.log(`数据库已有 ${count} 个用户，跳过 seed`);
      return;
    }
    this.logger.log('数据库为空，开始写入演示数据…');

    // === 用户 ===
    const users = await this.users.save([
      { id: 1, username: 'boss',      full_name: '梁总',   role: 'boss',      default_commission_rate: 0,   phone: '13800000001' },
      { id: 2, username: 'finance',   full_name: '陈会计', role: 'finance',   default_commission_rate: 0,   phone: '13800000002' },
      { id: 3, username: 'warehouse', full_name: '黄仓管', role: 'warehouse', default_commission_rate: 0,   phone: '13800000003' },
      { id: 4, username: 'sales01',   full_name: '李业务', role: 'sales',     default_commission_rate: 3,   phone: '13800000004' },
      { id: 5, username: 'sales02',   full_name: '王业务', role: 'sales',     default_commission_rate: 2.5, phone: '13800000005' },
    ]);

    // === 产品 ===
    const products = await this.products.save([
      { id: 1, category: '卤鸡爪',   origin: '山东聊城', factory_code: 'JZ-LJ-001', spec: '30g/袋×50袋/箱',  grade: 'A级',  qty_per_unit: 50,  goods_location: '佛山冷库A', remark: '袋装卤味，线下主力' },
      { id: 2, category: '卤鸡爪',   origin: '山东聊城', factory_code: 'JZ-LJ-002', spec: '50g/袋×40袋/箱',  grade: 'A级',  qty_per_unit: 40,  goods_location: '佛山冷库A', remark: '大袋家庭装' },
      { id: 3, category: '泡椒凤爪', origin: '四川成都', factory_code: 'JZ-PJ-088', spec: '160g/袋×30袋/箱', grade: '精品', qty_per_unit: 30,  goods_location: '江门冷库B', remark: '网红爆款' },
      { id: 4, category: '柠檬凤爪', origin: '广东开平', factory_code: 'JZ-NM-201', spec: '200g/盒×24盒/箱', grade: 'B级',  qty_per_unit: 24,  goods_location: '开平冷库',  remark: '本地厂家代工' },
      { id: 5, category: '虎皮凤爪', origin: '广东广州', factory_code: 'JZ-HP-055', spec: '500g/袋×10袋/箱', grade: 'A级',  qty_per_unit: 10,  goods_location: '佛山冷库A', remark: '餐饮渠道供应' },
      { id: 6, category: '酱卤鸡爪', origin: '广东江门', factory_code: 'JZ-JL-050', spec: '100g/袋×60袋/箱', grade: 'A级',  qty_per_unit: 60,  goods_location: '开平冷库',  remark: '散装称重款' },
    ]);

    // === 双税票价 ===
    await this.prices.save([
      { id: 1,  product_id: 1, tax_rate: 1, price: 18.80, effective_from: '2026-01-01' },
      { id: 2,  product_id: 1, tax_rate: 9, price: 20.50, effective_from: '2026-01-01' },
      { id: 3,  product_id: 2, tax_rate: 1, price: 26.50, effective_from: '2026-01-01' },
      { id: 4,  product_id: 2, tax_rate: 9, price: 28.80, effective_from: '2026-01-01' },
      { id: 5,  product_id: 3, tax_rate: 1, price: 38.00, effective_from: '2026-01-01' },
      { id: 6,  product_id: 3, tax_rate: 9, price: 41.20, effective_from: '2026-01-01' },
      { id: 7,  product_id: 4, tax_rate: 1, price: 32.50, effective_from: '2026-01-01' },
      { id: 8,  product_id: 4, tax_rate: 9, price: 35.40, effective_from: '2026-01-01' },
      { id: 9,  product_id: 5, tax_rate: 1, price: 58.00, effective_from: '2026-01-01' },
      { id: 10, product_id: 5, tax_rate: 9, price: 62.50, effective_from: '2026-01-01' },
      { id: 11, product_id: 6, tax_rate: 1, price: 22.00, effective_from: '2026-01-01' },
      { id: 12, product_id: 6, tax_rate: 9, price: 24.00, effective_from: '2026-01-01' },
    ]);

    // === 供应商 ===
    const suppliers = await this.suppliers.save([
      { id: 1, name: '山东聊城福源禽业',   contact_name: '张经理', phone: '13700001001', address: '山东省聊城市东昌府区', settle_type: '月结30天', remark: '卤鸡爪主力货源' },
      { id: 2, name: '四川川味泡椒食品厂', contact_name: '吴老板', phone: '13700001002', address: '成都市郫都区',         settle_type: '现款',     remark: '泡椒凤爪长期合作' },
      { id: 3, name: '开平本地酱卤食品厂', contact_name: '梁老板', phone: '13700001003', address: '开平市水口镇',         settle_type: '货到付款', remark: '同城配送' },
      { id: 4, name: '广州虎皮凤爪供应链', contact_name: '林经理', phone: '13700001004', address: '广州市番禺区石基镇',   settle_type: '月结45天', remark: '餐饮大客户供应' },
    ]);

    // === 采购单 ===
    await this.purchaseOrders.save([
      { id: 1, po_no: 'PO20260501-01', supplier_id: 1, product_id: 1, qty: 500, cost_price: 14.20, purchase_date: '2026-05-02', settle_status: 'done',    paid_amount: 7100,  remark: '5月首批卤鸡爪',   created_by: 3 },
      { id: 2, po_no: 'PO20260508-02', supplier_id: 1, product_id: 2, qty: 300, cost_price: 20.50, purchase_date: '2026-05-08', settle_status: 'partial', paid_amount: 3000,  remark: '大袋装分批到货', created_by: 3 },
      { id: 3, po_no: 'PO20260512-03', supplier_id: 2, product_id: 3, qty: 200, cost_price: 28.80, purchase_date: '2026-05-12', settle_status: 'unpaid',  paid_amount: 0,     remark: '泡椒凤爪新品',   created_by: 3 },
      { id: 4, po_no: 'PO20260518-04', supplier_id: 3, product_id: 4, qty: 150, cost_price: 24.00, purchase_date: '2026-05-18', settle_status: 'done',    paid_amount: 3600,  remark: '',               created_by: 3 },
      { id: 5, po_no: 'PO20260522-05', supplier_id: 4, product_id: 5, qty: 80,  cost_price: 45.00, purchase_date: '2026-05-22', settle_status: 'unpaid',  paid_amount: 0,     remark: '虎皮凤爪餐饮单', created_by: 3 },
      { id: 6, po_no: 'PO20260528-06', supplier_id: 1, product_id: 6, qty: 200, cost_price: 16.80, purchase_date: '2026-05-28', settle_status: 'done',    paid_amount: 3360,  remark: '酱卤鸡爪现款',   created_by: 3 },
    ]);

    // === 库存批次 ===
    await this.batches.save([
      { id: 1, batch_no: 'B20260502-01', product_id: 1, purchase_order_id: 1, qty_total: 500, qty_remaining: 320, warehouse: '佛山冷库A-1区', holder: '黄仓管', status: 'in_stock', created_at: new Date('2026-05-02 10:00') },
      { id: 2, batch_no: 'B20260508-01', product_id: 2, purchase_order_id: 2, qty_total: 300, qty_remaining: 260, warehouse: '佛山冷库A-1区', holder: '黄仓管', status: 'in_stock', created_at: new Date('2026-05-08 14:30') },
      { id: 3, batch_no: 'B20260512-01', product_id: 3, purchase_order_id: 3, qty_total: 200, qty_remaining: 200, warehouse: '江门冷库B-2区', holder: '黄仓管', status: 'in_stock', created_at: new Date('2026-05-12 09:15') },
      { id: 4, batch_no: 'B20260518-01', product_id: 4, purchase_order_id: 4, qty_total: 150, qty_remaining: 75,  warehouse: '开平冷库',     holder: '梁总',   status: 'in_stock', created_at: new Date('2026-05-18 11:00') },
      { id: 5, batch_no: 'B20260522-01', product_id: 5, purchase_order_id: 5, qty_total: 80,  qty_remaining: 80,  warehouse: '佛山冷库A-2区', holder: '黄仓管', status: 'in_stock', created_at: new Date('2026-05-22 16:20') },
      { id: 6, batch_no: 'B20260528-01', product_id: 6, purchase_order_id: 6, qty_total: 200, qty_remaining: 170, warehouse: '开平冷库',     holder: '梁总',   status: 'in_stock', created_at: new Date('2026-05-28 08:40') },
    ]);

    // === 库存流水 ===
    await this.movements.save([
      { id: 1, batch_id: 1, type: 'in',  qty: 500, operator: '黄仓管', remark: '采购入库（冷藏车到货）',     created_at: new Date('2026-05-02 10:00') },
      { id: 2, batch_id: 1, type: 'out', qty: 150, operator: '李业务', to_holder: '佛山食杂店',   ref_order_no: 'SO20260505-01', remark: '销售出库', created_at: new Date('2026-05-05 11:20') },
      { id: 3, batch_id: 1, type: 'out', qty: 30,  operator: '王业务', to_holder: '中山连锁商超', ref_order_no: 'SO20260510-02', remark: '销售出库', created_at: new Date('2026-05-10 15:00') },
      { id: 4, batch_id: 2, type: 'in',  qty: 300, operator: '黄仓管', remark: '采购入库',                  created_at: new Date('2026-05-08 14:30') },
      { id: 5, batch_id: 2, type: 'out', qty: 40,  operator: '李业务', to_holder: '中山烧烤店',   ref_order_no: 'SO20260512-01', remark: '销售出库', created_at: new Date('2026-05-12 09:30') },
      { id: 6, batch_id: 4, type: 'in',  qty: 150, operator: '梁总',   remark: '采购入库',                  created_at: new Date('2026-05-18 11:00') },
      { id: 7, batch_id: 4, type: 'out', qty: 75,  operator: '王业务', to_holder: '开平餐饮连锁', ref_order_no: 'SO20260520-01', remark: '销售出库', created_at: new Date('2026-05-20 10:00') },
      { id: 8, batch_id: 6, type: 'in',  qty: 200, operator: '梁总',   remark: '采购入库',                  created_at: new Date('2026-05-28 08:40') },
      { id: 9, batch_id: 6, type: 'out', qty: 30,  operator: '李业务', to_holder: '江门夜市档口', ref_order_no: 'SO20260530-01', remark: '销售出库', created_at: new Date('2026-05-30 14:00') },
    ]);

    // === 媒体资料 ===
    await this.media.save(
      products.map((p, i) => ({
        id: i + 1,
        product_id: p.id,
        type: 'image' as const,
        file_path: `https://picsum.photos/seed/chickenpaw${p.id}/400/300`,
        thumb: `https://picsum.photos/seed/chickenpaw${p.id}/120/90`,
        uploader_id: 3,
        created_at: new Date('2026-05-30 12:00'),
      })),
    );

    // === 客户 ===
    await this.customers.save([
      { id: 1, name: '佛山南海食杂批发部',     contact_name: '刘老板', phone: '13900001001', address: '佛山市南海区里水镇',   type: '批发商', nature: '个体户', sales_user_id: 4, remark: '月结客户' },
      { id: 2, name: '中山华联连锁商超',       contact_name: '张采购', phone: '13900001002', address: '中山市石岐区',           type: '商超',   nature: '国企',   sales_user_id: 5, remark: '直供' },
      { id: 3, name: '广州越秀零食批发',       contact_name: '陈老板', phone: '13900001003', address: '广州市越秀区一德路',     type: '批发商', nature: '个体户', sales_user_id: 4, remark: '老客户' },
      { id: 4, name: '开平本地餐饮连锁',       contact_name: '吴总',   phone: '13900001004', address: '开平市长沙区',           type: '餐饮',   nature: '个体户', sales_user_id: 5, remark: '需冷链配送' },
      { id: 5, name: '江门蓬江夜市档口联盟',   contact_name: '许经理', phone: '13900001005', address: '江门市蓬江区',           type: '餐饮',   nature: '国企',   sales_user_id: 4, remark: '团购大客户' },
    ]);

    // === 销售单 ===
    const salesOrders = await this.salesOrders.save([
      { id: 1, so_no: 'SO20260505-01', customer_id: 1, sales_user_id: 4, product_id: 1, batch_id: 1, qty: 150, sale_price: 22.50, tax_rate: 1, commission_rate: 3,   commission_amt: 101.25, receive_status: 'done',    received_amount: 3375,   sale_date: '2026-05-05', remark: '月结回款' },
      { id: 2, so_no: 'SO20260510-02', customer_id: 2, sales_user_id: 5, product_id: 1, batch_id: 1, qty: 30,  sale_price: 24.00, tax_rate: 1, commission_rate: 2.5, commission_amt: 18.00,  receive_status: 'partial', received_amount: 360,    sale_date: '2026-05-10', remark: '商超直供' },
      { id: 3, so_no: 'SO20260512-01', customer_id: 3, sales_user_id: 4, product_id: 2, batch_id: 2, qty: 40,  sale_price: 32.50, tax_rate: 9, commission_rate: 3,   commission_amt: 39.00,  receive_status: 'unpaid',  received_amount: 0,      sale_date: '2026-05-12', remark: '' },
      { id: 4, so_no: 'SO20260520-01', customer_id: 4, sales_user_id: 5, product_id: 4, batch_id: 4, qty: 75,  sale_price: 42.80, tax_rate: 1, commission_rate: 2.5, commission_amt: 80.25,  receive_status: 'done',    received_amount: 3210,   sale_date: '2026-05-20', remark: '' },
      { id: 5, so_no: 'SO20260530-01', customer_id: 5, sales_user_id: 4, product_id: 6, batch_id: 6, qty: 30,  sale_price: 28.00, tax_rate: 1, commission_rate: 3,   commission_amt: 25.20,  receive_status: 'unpaid',  received_amount: 0,      sale_date: '2026-05-30', remark: '夜市团购' },
    ]);

    // === 佣金记录 ===
    await this.commissions.save(
      salesOrders.map((s, i) => ({
        id: i + 1,
        sales_order_id: s.id,
        sales_user_id: s.sales_user_id,
        rate: s.commission_rate,
        amount: s.commission_amt,
        settle_status: s.receive_status === 'done' ? 'paid' : 'pending',
        settled_at: s.receive_status === 'done' ? new Date('2026-05-31 18:00') : null,
      })),
    );

    // === 支付账户 ===
    await this.accounts.save([
      { id: 1, name: '丰晟达对公账户',  type: 'public',     is_company: true,  status: 'active', opening_balance: 100000 },
      { id: 2, name: '梁总微信私户',    type: 'wx_private', is_company: false, status: 'active', opening_balance: 12500 },
      { id: 3, name: '陈会计支付宝',    type: 'alipay',     is_company: false, status: 'active', opening_balance: 3000 },
      { id: 4, name: '公司备用现金',    type: 'cash',       is_company: false, status: 'active', opening_balance: 5000 },
    ]);

    // === 财务流水 ===
    await this.transactions.save([
      { id: 1, account_id: 1, direction: 'out', amount: 7100,  source_type: 'purchase',   ref_order_id: 1, ref_order_no: 'PO20260501-01', counter_party: '山东聊城福源禽业',     operator_id: 2, remark: '付5月首批卤鸡爪',     created_at: new Date('2026-05-15 10:00') },
      { id: 2, account_id: 1, direction: 'in',  amount: 3375,  source_type: 'sale',       ref_order_id: 1, ref_order_no: 'SO20260505-01', counter_party: '佛山南海食杂批发部',   operator_id: 2, remark: '卤鸡爪月结回款',     created_at: new Date('2026-05-20 14:30') },
      { id: 3, account_id: 2, direction: 'in',  amount: 360,   source_type: 'sale',       ref_order_id: 2, ref_order_no: 'SO20260510-02', counter_party: '中山华联连锁商超',     operator_id: 2, remark: '商超直供收款',       created_at: new Date('2026-05-15 11:00') },
      { id: 4, account_id: 1, direction: 'out', amount: 3600,  source_type: 'purchase',   ref_order_id: 4, ref_order_no: 'PO20260518-04', counter_party: '开平本地酱卤食品厂',   operator_id: 2, remark: '',                   created_at: new Date('2026-05-19 09:00') },
      { id: 5, account_id: 1, direction: 'in',  amount: 3210,  source_type: 'sale',       ref_order_id: 4, ref_order_no: 'SO20260520-01', counter_party: '开平本地餐饮连锁',     operator_id: 2, remark: '',                   created_at: new Date('2026-05-22 10:30') },
      { id: 6, account_id: 2, direction: 'out', amount: 101.25,source_type: 'commission', ref_order_id: 1, ref_order_no: 'SO20260505-01', counter_party: '李业务',             operator_id: 2, remark: '5月佣金',             created_at: new Date('2026-05-31 18:00') },
      { id: 7, account_id: 3, direction: 'in',  amount: 3000,  source_type: 'manual',                                                       counter_party: '备用金充值',         operator_id: 2, remark: '备用金充值',         created_at: new Date('2026-05-01 09:00') },
      { id: 8, account_id: 1, direction: 'out', amount: 3360,  source_type: 'purchase',   ref_order_id: 6, ref_order_no: 'PO20260528-06', counter_party: '山东聊城福源禽业',     operator_id: 2, remark: '酱卤鸡爪现款',       created_at: new Date('2026-05-30 16:00') },
    ]);

    this.logger.log('✅ 演示数据写入完成');
  }
}
