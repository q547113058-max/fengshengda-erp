// ProductsService — 产品/价格业务逻辑
// 抽离 controller，让 controller 纯做 HTTP 路由 + DTO 验证
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Product } from '../entities/product.entity';
import { ProductPrice } from '../entities/product-price.entity';
import { InventoryBatch } from '../entities/inventory-batch.entity';
import { CreateProductDto, UpdateProductDto, ProductPriceDto, UpdatePriceDto } from '../dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private products: Repository<Product>,
    @InjectRepository(ProductPrice) private prices: Repository<ProductPrice>,
    private ds: DataSource,
  ) {}

  /** 列表（带所有税票价） */
  async list() {
    const products = await this.products.find({ order: { id: 'ASC' } });
    const prices = await this.prices.find();
    return products.map(p => ({
      ...p,
      prices: prices.filter(pr => pr.product_id === p.id),
    }));
  }

  /** 单个 */
  async one(id: number) {
    const p = await this.products.findOne({ where: { id } });
    if (!p) throw new NotFoundException(`Product ${id} not found`);
    return p;
  }

  /** 产品所有税票价 */
  async pricesFor(id: number) {
    return this.prices.find({ where: { product_id: id }, order: { tax_rate: 'ASC' } });
  }

  /** 创建产品（可同时挂 1%/9% 双票价） */
  async create(body: CreateProductDto) {
    const { prices, ...productData } = body;
    const product = await this.products.save(this.products.create(productData));
    if (prices?.length) {
      await this.prices.save(prices.map(p => this.prices.create({ ...p, product_id: product.id })));
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
      await qr.query(`DELETE FROM sales_orders WHERE product_id = ${id}`);
      await qr.query(`DELETE FROM purchase_orders WHERE product_id = ${id}`);
      await qr.query(`DELETE FROM media_assets WHERE product_id = ${id}`);
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
