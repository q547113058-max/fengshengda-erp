// ProductsService — 产品/价格业务逻辑
// 抽离 controller，让 controller 纯做 HTTP 路由 + DTO 验证
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Product } from '../entities/product.entity';
import { ProductPrice } from '../entities/product-price.entity';
import { InventoryBatch } from '../entities/inventory-batch.entity';
import { InventoryMovement } from '../entities/inventory-movement.entity';
import { CreateProductDto, UpdateProductDto, ProductPriceDto, UpdatePriceDto } from '../dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private products: Repository<Product>,
    @InjectRepository(ProductPrice) private prices: Repository<ProductPrice>,
    private ds: DataSource,
  ) {}

  /** 列表（带所有税票价 + 实际库存 + 首张图片） */
  async list() {
    const products = await this.products.find({ order: { id: 'DESC' } });
    const prices = await this.prices.find();
    // 查每个产品的实际库存（批次剩余合计）
    const batches = await this.ds.query(
      `SELECT product_id, SUM(qty_remaining) as total_remaining, COUNT(*) as batch_count FROM inventory_batches GROUP BY product_id`
    );
    // 查每个产品的首张图片
    const images = await this.ds.query(
      `SELECT m.product_id, m.file_path as image_url FROM media_assets m WHERE m.id IN (SELECT MIN(id) FROM media_assets GROUP BY product_id)`
    );
    const stockMap = new Map((batches as any[]).map((b: any) => [b.product_id, { remaining: b.total_remaining ?? 0, count: b.batch_count ?? 0 }]));
    const imageMap = new Map((images as any[]).map((img: any) => [img.product_id, img.image_url]));
    return products.map(p => ({
      ...p,
      prices: prices.filter(pr => pr.product_id === p.id),
      stock_remaining: stockMap.get(p.id)?.remaining ?? 0,
      batch_count: stockMap.get(p.id)?.count ?? 0,
      image_url: imageMap.get(p.id) || null,
    }));
  }

  /** 单个 */
  async one(id: number) {
    const p = await this.products.findOne({ where: { id }, relations: ['prices'] });
    if (!p) throw new NotFoundException(`Product ${id} not found`);
    return p;
  }

  /** 产品所有税票价 */
  async pricesFor(id: number) {
    return this.prices.find({ where: { product_id: id }, order: { tax_rate: 'ASC' } });
  }

  /** 创建产品（可同时挂价格 + 有货地时自动建库存批次） */
  async create(body: CreateProductDto) {
    const { prices, ...productData } = body;
    // 前端留空时 qty_per_unit 可能为 undefined/null，设默认值 1
    if (productData.qty_per_unit == null) (productData as any).qty_per_unit = 1;
    const qty = (productData as any).qty_per_unit as number;
    const warehouse = (productData as any).goods_location as string | undefined;

    const product = (await this.products.save(this.products.create(productData as any))) as unknown as Product;
    if (prices?.length) {
      await this.prices.save(prices.map(p => this.prices.create({ ...p, product_id: product.id })));
    }

    // 填了库存 → 自动建批次和入库流水（货地默认「未指定仓库」）
    if (qty > 0) {
      if (!warehouse) throw new BadRequestException('填写了库存必须填写货地');
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const batchRepo = this.ds.getRepository(InventoryBatch);
      const count = await batchRepo.count();
      const batchNo = `B${today}-${String(count + 1).padStart(3, '0')}`;
      const batch = await batchRepo.save(batchRepo.create({
        batch_no: batchNo,
        product_id: product.id,
        qty_total: qty,
        qty_remaining: qty,
        warehouse,
        holder: '黄仓管',
        status: 'in_stock' as const,
      }));
      const moveRepo = this.ds.getRepository(InventoryMovement);
      await moveRepo.save(moveRepo.create({
        batch_id: batch.id,
        type: 'in' as const,
        qty,
        operator: '黄仓管',
        remark: '产品创建时初始库存',
      }));
    }

    return this.products.findOne({ where: { id: product.id } });
  }

  /** 更新产品 */
  async update(id: number, body: any) {
    const { prices, ...productData } = body;
    if (Object.keys(productData).length > 0) {
      await this.products.update(id, productData);
    }
    if (prices !== undefined) {
      await this.prices.delete({ product_id: id });
      if (prices.length) {
        await this.prices.save(prices.map((p: any) => this.prices.create({ ...p, product_id: id })));
      }
    }
    return this.products.findOne({ where: { id } });
  }

  /** 删除产品（兼容 SQLite/MySQL：FK 在事务外关闭，事务内级联删全部关联数据） */
  async remove(id: number) {
    const qr = this.ds.createQueryRunner();
    await qr.connect();
    const isSQLite = this.ds.options.type === 'better-sqlite3';
    await qr.query(isSQLite ? 'PRAGMA foreign_keys = OFF' : 'SET FOREIGN_KEY_CHECKS = 0');
    await qr.startTransaction();
    try {
      const batches = await qr.manager.find(InventoryBatch, {
        where: { product_id: id },
        select: ['id'],
      });
      const batchIds = batches.map(b => b.id);

      if (batchIds.length > 0) {
        await qr.query(`DELETE FROM inventory_movements WHERE batch_id IN (${batchIds.join(',')})`);
        await qr.query(`DELETE FROM media_assets WHERE batch_id IN (${batchIds.join(',')})`);
      }
      await qr.query(`DELETE FROM inventory_batches WHERE product_id = ${id}`);
      // 业务单据保留，解除产品关联
      await qr.query(`UPDATE sales_orders SET product_id = 0 WHERE product_id = ${id}`);
      await qr.query(`UPDATE purchase_orders SET product_id = 0 WHERE product_id = ${id}`);
      await qr.query(`UPDATE media_assets SET product_id = 0 WHERE product_id = ${id}`);
      await qr.query(`DELETE FROM product_prices WHERE product_id = ${id}`);
      await qr.query(`DELETE FROM products WHERE id = ${id}`);

      await qr.commitTransaction();
      return { ok: true };
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.query(isSQLite ? 'PRAGMA foreign_keys = ON' : 'SET FOREIGN_KEY_CHECKS = 1');
      await qr.release();
    }
  }

  /** 新增税票价 */
  async addPrice(productId: number, body: ProductPriceDto) {
    return this.prices.save(this.prices.create({ ...body, product_id: productId }));
  }

  /** 更新税票价 */
  async updatePrice(priceId: number, body: UpdatePriceDto) {
    await this.prices.update(priceId, body);
    return this.prices.findOne({ where: { id: priceId } });
  }

  /** 删除税票价 */
  async deletePrice(priceId: number) {
    await this.prices.delete(priceId);
    return { ok: true };
  }
}
