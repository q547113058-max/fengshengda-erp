// InitSchema — 14 张表初始建表
// 用法：npm run migration:run
// 历史：v0.1 (2026-06-07) — 与 entity 完全对齐
// 未来：synchronize=false 后，entity 变更用 `npm run migration:generate` 自动检测差异
import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1717750000000 implements MigrationInterface {
  name = 'InitSchema1717750000000';

  public async up(q: QueryRunner): Promise<void> {
    // 顺序：先无外键表 → 有人引用的表
    // 注：实际生产 schema 由 synchronize 自动建过；本 migration 是 "document + 可重放" 备份

    await q.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        default_commission_rate REAL NOT NULL DEFAULT 0,
        phone VARCHAR(30)
      )
    `);

    await q.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(120) NOT NULL,
        contact_name VARCHAR(50),
        phone VARCHAR(30),
        address VARCHAR(200),
        settle_type VARCHAR(40),
        remark TEXT
      )
    `);

    await q.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT PRIMARY KEY AUTO_INCREMENT,
        category VARCHAR(80) NOT NULL,
        origin VARCHAR(80),
        factory_code VARCHAR(80) NOT NULL,
        spec VARCHAR(80),
        grade VARCHAR(40),
        qty_per_unit INT NOT NULL DEFAULT 0,
        goods_location VARCHAR(80),
        remark TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await q.query(`
      CREATE TABLE IF NOT EXISTS product_prices (
        id INT PRIMARY KEY AUTO_INCREMENT,
        product_id INT NOT NULL,
        tax_rate REAL NOT NULL,
        price REAL NOT NULL,
        effective_from DATE NOT NULL,
        CONSTRAINT fk_price_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);

    await q.query(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id INT PRIMARY KEY AUTO_INCREMENT,
        po_no VARCHAR(30) UNIQUE NOT NULL,
        supplier_id INT NOT NULL,
        product_id INT NOT NULL,
        qty INT NOT NULL,
        cost_price REAL NOT NULL,
        purchase_date DATE NOT NULL,
        settle_status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
        paid_amount REAL NOT NULL DEFAULT 0,
        remark TEXT,
        created_by INT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_po_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
        CONSTRAINT fk_po_product FOREIGN KEY (product_id) REFERENCES products(id),
        CONSTRAINT fk_po_creator FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);

    await q.query(`
      CREATE TABLE IF NOT EXISTS inventory_batches (
        id INT PRIMARY KEY AUTO_INCREMENT,
        batch_no VARCHAR(40) UNIQUE NOT NULL,
        product_id INT NOT NULL,
        purchase_order_id INT,
        qty_total INT NOT NULL,
        qty_remaining INT NOT NULL,
        warehouse VARCHAR(60),
        holder VARCHAR(60),
        status VARCHAR(20) NOT NULL DEFAULT 'in_stock',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_batch_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        CONSTRAINT fk_batch_po FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id)
      )
    `);

    await q.query(`
      CREATE TABLE IF NOT EXISTS inventory_movements (
        id INT PRIMARY KEY AUTO_INCREMENT,
        batch_id INT NOT NULL,
        type VARCHAR(20) NOT NULL,
        qty INT NOT NULL,
        operator VARCHAR(60),
        to_holder VARCHAR(60),
        ref_order_no VARCHAR(60),
        remark TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_mv_batch FOREIGN KEY (batch_id) REFERENCES inventory_batches(id) ON DELETE CASCADE
      )
    `);

    await q.query(`
      CREATE TABLE IF NOT EXISTS media_assets (
        id INT PRIMARY KEY AUTO_INCREMENT,
        product_id INT,
        batch_id INT,
        type VARCHAR(20) NOT NULL,
        file_path VARCHAR(300) NOT NULL,
        thumb VARCHAR(300),
        uploader_id INT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_media_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
        CONSTRAINT fk_media_batch FOREIGN KEY (batch_id) REFERENCES inventory_batches(id) ON DELETE SET NULL,
        CONSTRAINT fk_media_uploader FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await q.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(120) NOT NULL,
        contact_name VARCHAR(50),
        phone VARCHAR(30),
        address VARCHAR(200),
        type VARCHAR(40),
        nature VARCHAR(40),
        sales_user_id INT,
        remark TEXT,
        CONSTRAINT fk_customer_salesman FOREIGN KEY (sales_user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await q.query(`
      CREATE TABLE IF NOT EXISTS sales_orders (
        id INT PRIMARY KEY AUTO_INCREMENT,
        so_no VARCHAR(30) UNIQUE NOT NULL,
        customer_id INT NOT NULL,
        sales_user_id INT NOT NULL,
        product_id INT NOT NULL,
        batch_id INT NOT NULL,
        qty INT NOT NULL,
        sale_price REAL NOT NULL,
        tax_rate REAL NOT NULL DEFAULT 1,
        commission_rate REAL NOT NULL DEFAULT 0,
        commission_amt REAL NOT NULL DEFAULT 0,
        receive_status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
        received_amount REAL NOT NULL DEFAULT 0,
        sale_date DATE NOT NULL,
        remark TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        CONSTRAINT fk_so_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
        CONSTRAINT fk_so_user FOREIGN KEY (sales_user_id) REFERENCES users(id),
        CONSTRAINT fk_so_product FOREIGN KEY (product_id) REFERENCES products(id),
        CONSTRAINT fk_so_batch FOREIGN KEY (batch_id) REFERENCES inventory_batches(id)
      )
    `);

    await q.query(`
      CREATE TABLE IF NOT EXISTS commission_records (
        id INT PRIMARY KEY AUTO_INCREMENT,
        sales_order_id INT NOT NULL,
        sales_user_id INT NOT NULL,
        rate REAL NOT NULL,
        amount REAL NOT NULL,
        settle_status VARCHAR(20) NOT NULL DEFAULT 'pending',
        settled_at DATETIME,
        CONSTRAINT fk_comm_so FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id),
        CONSTRAINT fk_comm_user FOREIGN KEY (sales_user_id) REFERENCES users(id)
      )
    `);

    await q.query(`
      CREATE TABLE IF NOT EXISTS payment_accounts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(60) NOT NULL,
        type VARCHAR(20) NOT NULL,
        is_company TINYINT(1) NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        opening_balance REAL NOT NULL DEFAULT 0
      )
    `);

    await q.query(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        account_id INT NOT NULL,
        direction VARCHAR(10) NOT NULL,
        amount REAL NOT NULL,
        source_type VARCHAR(20) NOT NULL,
        ref_order_id INT,
        ref_order_no VARCHAR(30),
        counter_party VARCHAR(120),
        operator_id INT,
        remark TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        reversed_by_tx_id INT,
        CONSTRAINT fk_tx_account FOREIGN KEY (account_id) REFERENCES payment_accounts(id),
        CONSTRAINT fk_tx_operator FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await q.query(`
      CREATE TABLE IF NOT EXISTS order_sequences (
        prefix VARCHAR(10) NOT NULL,
        ymd VARCHAR(6) NOT NULL,
        last_seq INT NOT NULL DEFAULT 0,
        PRIMARY KEY (prefix, ymd)
      )
    `);

    // 索引（按 entity 隐式 @Index 推断；TypeORM 也会自动建）
    await q.query(`CREATE INDEX idx_po_date ON purchase_orders (purchase_date)`);
    await q.query(`CREATE INDEX idx_so_date ON sales_orders (sale_date)`);
    await q.query(`CREATE INDEX idx_batch_status ON inventory_batches (status)`);
    await q.query(`CREATE INDEX idx_tx_date ON payment_transactions (created_at)`);
    await q.query(`CREATE INDEX idx_mv_date ON inventory_movements (created_at)`);
  }

  public async down(q: QueryRunner): Promise<void> {
    // 反向：DROP INDEX → DROP TABLE
    await q.query(`DROP INDEX idx_mv_date ON inventory_movements`);
    await q.query(`DROP INDEX idx_tx_date ON payment_transactions`);
    await q.query(`DROP INDEX idx_batch_status ON inventory_batches`);
    await q.query(`DROP INDEX idx_so_date ON sales_orders`);
    await q.query(`DROP INDEX idx_po_date ON purchase_orders`);

    await q.query(`DROP TABLE IF EXISTS order_sequences`);
    await q.query(`DROP TABLE IF EXISTS payment_transactions`);
    await q.query(`DROP TABLE IF EXISTS payment_accounts`);
    await q.query(`DROP TABLE IF EXISTS commission_records`);
    await q.query(`DROP TABLE IF EXISTS sales_orders`);
    await q.query(`DROP TABLE IF EXISTS customers`);
    await q.query(`DROP TABLE IF EXISTS media_assets`);
    await q.query(`DROP TABLE IF EXISTS inventory_movements`);
    await q.query(`DROP TABLE IF EXISTS inventory_batches`);
    await q.query(`DROP TABLE IF EXISTS purchase_orders`);
    await q.query(`DROP TABLE IF EXISTS product_prices`);
    await q.query(`DROP TABLE IF EXISTS products`);
    await q.query(`DROP TABLE IF EXISTS suppliers`);
    await q.query(`DROP TABLE IF EXISTS users`);
  }
}
