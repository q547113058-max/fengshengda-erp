# 业务流程时序图

> 业务培训 + 新人 onboarding 材料。可在 GitHub / VS Code / Typora 直接渲染。

## 目录

- [1. 采购流程](#1-采购流程)
- [2. 销售流程](#2-销售流程)
- [3. 销售反冲流程](#3-销售反冲流程)
- [4. 财务反冲流程](#4-财务反冲流程)
- [5. 月度对账流程](#5-月度对账流程)
- [6. 用户登录 + 权限流程](#6-用户登录--权限流程)

---

## 1. 采购流程

**业务场景**：仓管员录入采购单 → 自动建批次 + 入库流水 → 财务付款。

```mermaid
sequenceDiagram
    autonumber
    actor 仓管 as 仓管员
    actor 财务 as 财务
    participant API as 后端
    participant DB as MariaDB

    仓管->>API: POST /api/purchase
    Note over 仓管,API: { supplier_id, product_id, qty, cost_price, paid_amount? }

    API->>DB: BEGIN TRANSACTION
    API->>DB: SELECT * FROM order_sequences WHERE prefix='PO' AND ymd=今天 FOR UPDATE
    DB-->>API: last_seq
    API->>DB: UPDATE order_sequences SET last_seq=last_seq+1
    API->>DB: INSERT purchase_orders (po_no, supplier_id, qty, cost_price, settle_status)
    DB-->>API: po_id

    API->>DB: INSERT inventory_batches (batch_no='B<date>-<po_id>', qty_total, qty_remaining, status='in_stock')
    DB-->>API: batch_id

    API->>DB: INSERT inventory_movements (type='in', qty, ref_order_no=po_no)

    alt 如果有 paid_amount
        API->>DB: SELECT * FROM payment_accounts WHERE is_company=true
        API->>DB: INSERT payment_transactions (direction='out', source_type='purchase', amount, ref_order_id=po_id)
    end

    API->>DB: COMMIT
    API-->>仓管: 201 + purchase_order (含 po_no, settle_status)

    Note over 财务,DB: 数天后...

    财务->>API: POST /api/purchase/:id/pay
    Note over 财务,API: { amount, account_id }
    API->>DB: BEGIN
    API->>DB: SELECT purchase_order, 校验 (paid+amount) <= (qty*cost_price)
    API->>DB: UPDATE purchase_orders SET paid_amount=paid+amount, settle_status=...
    API->>DB: INSERT payment_transactions (direction='out', source_type='purchase')
    API->>DB: COMMIT
    API-->>财务: 200 + purchase_order
```

---

## 2. 销售流程

**业务场景**：业务员开销售单 → 扣库存 + 出库流水 + 佣金记录 → 财务收款。

```mermaid
sequenceDiagram
    autonumber
    actor 业务 as 业务员
    actor 财务 as 财务
    participant API as 后端
    participant DB as MariaDB

    业务->>API: POST /api/sales
    Note over 业务,API: { customer_id, sales_user_id, product_id, batch_id, qty, sale_price, commission_rate, account_id? }

    API->>DB: BEGIN
    API->>DB: SELECT * FROM inventory_batches WHERE id=batch_id FOR UPDATE
    Note right of DB: MySQL 行锁防超卖<br/>SQLite 走整库锁
    DB-->>API: batch (qty_remaining)

    alt qty_remaining < qty
        API->>DB: ROLLBACK
        API-->>业务: 400 "批次剩余 X 箱，不足 Y"
    end

    API->>DB: SELECT * FROM order_sequences WHERE prefix='SO' FOR UPDATE
    API->>DB: UPDATE order_sequences SET last_seq++
    API->>DB: INSERT sales_orders (so_no, ..., status='active')
    DB-->>API: so_id

    API->>DB: UPDATE inventory_batches SET qty_remaining=qty_remaining-qty, status=...
    API->>DB: INSERT inventory_movements (type='out', qty, ref_order_no=so_no)
    API->>DB: INSERT commission_records (rate, amount, settle_status='pending')
    API->>DB: COMMIT
    API-->>业务: 201 + sales_order

    Note over 财务,DB: 客户付款后...

    财务->>API: POST /api/sales/:id/receive
    Note over 财务,API: { amount, account_id }
    API->>DB: BEGIN
    API->>DB: 校验 received+amount <= total
    API->>DB: UPDATE sales_orders SET received_amount=..., receive_status=...
    API->>DB: INSERT payment_transactions (direction='in', source_type='sale')
    API->>DB: COMMIT
    API-->>财务: 200

    Note over 业务: 月底结算佣金

    业务->>API: POST /api/commission/:id/settle
    API->>DB: UPDATE commission_records SET settle_status='paid', settled_at=NOW()
    API->>DB: INSERT payment_transactions (direction='out', source_type='commission')
```

---

## 3. 销售反冲流程

**业务场景**：发现销售单录错 / 客户退货 → 走反冲（不物理删单，保留历史）。

```mermaid
sequenceDiagram
    autonumber
    actor 业务 as 业务员
    participant API as 后端
    participant DB as MariaDB

    Note over 业务,DB: 已收款 2000 元的销售单 SO-001（status=active, received_amount=2000, qty=20）

    业务->>API: POST /api/sales/SO-001/reverse
    Note over 业务,API: { reason: "客户退货" }

    API->>DB: BEGIN
    API->>DB: SELECT sales_order WHERE id=SO-001
    alt status='cancelled'
        API->>DB: ROLLBACK
        API-->>业务: 400 "该销售单已反冲"
    end

    rect rgb(255, 240, 240)
        Note over API,DB: 1. 恢复库存
        API->>DB: UPDATE inventory_batches SET qty_remaining=qty_remaining+20 WHERE id=batch_id
    end

    rect rgb(240, 248, 255)
        Note over API,DB: 2. 写反向库存流水
        API->>DB: INSERT inventory_movements (type='return', qty=20, ref_order_no='RV-SO-001')
    end

    rect rgb(255, 248, 240)
        Note over API,DB: 3. 撤销佣金（仅 pending 状态）
        API->>DB: UPDATE commission_records SET settle_status='cancelled' WHERE sales_order_id=SO-001 AND settle_status='pending'
    end

    rect rgb(248, 255, 240)
        Note over API,DB: 4. 写反向收款
        API->>DB: SELECT payment_transactions WHERE source_type='sale' AND ref_order_id=SO-001
        loop 对每条收款
            API->>DB: INSERT payment_transactions (direction='out', source_type='sale_reverse', amount=原 amount)
        end
    end

    rect rgb(255, 240, 248)
        Note over API,DB: 5. 标 cancelled
        API->>DB: UPDATE sales_orders SET status='cancelled', received_amount=0, receive_status='unpaid', remark=原+反冲原因
    end

    API->>DB: COMMIT
    API-->>业务: 200 { ok: true, status: 'cancelled' }

    Note over 业务,DB: 历史完整保留：<br/>- SO-001 (cancelled, 200 字符备注)<br/>- RV-SO-001 出库流水<br/>- 反向收款 Tx
```

---

## 4. 财务反冲流程

**业务场景**：发现某条财务流水录错（金额/账户/对手方）→ 反冲。

```mermaid
sequenceDiagram
    autonumber
    actor 财务 as 财务
    participant API as 后端
    participant DB as MariaDB

    Note over 财务,DB: Tx #123 (status=active, direction='in', amount=5000, source_type='sale', ref_order_id=SO-001)

    财务->>API: POST /api/finance/transactions/123/reverse
    Note over 财务,API: { reason: "录错账户" }

    API->>DB: BEGIN
    API->>DB: SELECT payment_transactions WHERE id=123
    alt status='reversed'
        API->>DB: ROLLBACK
        API-->>财务: 400 "该流水已反冲"
    end

    API->>DB: INSERT payment_transactions (direction='out', amount=5000, source_type='sale_reverse', ref_order_no='RV-SO-001', counter_party=原)
    DB-->>API: new_tx_id
    API->>DB: UPDATE payment_transactions SET status='reversed', reversed_by_tx_id=new_tx_id WHERE id=123

    alt source_type='sale' AND ref_order_id
        API->>DB: SELECT sales_order
        API->>DB: UPDATE sales_orders SET received_amount=received_amount-5000, receive_status=重算 WHERE id=SO-001
    else source_type='purchase' AND ref_order_id
        API->>DB: SELECT purchase_order
        API->>DB: UPDATE purchase_orders SET paid_amount=paid_amount-5000, settle_status=重算 WHERE id=PO-001
    end

    API->>DB: COMMIT
    API-->>财务: 200 { ok: true, reversed: new_tx }
```

---

## 5. 月度对账流程

**业务场景**：财务每月 1 号对上月的销售 + 采购 + 收付款做汇总对账。

```mermaid
sequenceDiagram
    autonumber
    actor 财务 as 财务
    actor 老板 as 老板
    participant API as 后端
    participant DB as MariaDB

    财务->>API: GET /api/sales?sale_date_gte=2026-05-01&sale_date_lt=2026-06-01
    API->>DB: SELECT * FROM sales_orders WHERE sale_date BETWEEN ...
    DB-->>API: 50 单
    API-->>财务: 50 单 + 各 so_no + 金额 + 收款状态

    财务->>API: GET /api/purchase?purchase_date_gte=2026-05-01&purchase_date_lt=2026-06-01
    API->>DB: SELECT * FROM purchase_orders WHERE ...
    API-->>财务: 30 单

    财务->>API: GET /api/finance/transactions?direction=in&created_at_gte=2026-05-01
    API->>DB: SUM(amount) FROM payment_transactions
    API-->>财务: 总额 125,000

    财务->>API: GET /api/finance/accounts
    API-->>财务: 3 个账户余额列表

    财务->>API: GET /api/finance/ledger
    Note over API: 按 account_id + direction + date 分组
    API-->>财务: 分类账

    财务->>API: GET /api/dashboard/kpi
    API-->>财务: 4 KPI（销售/采购/账户余额/低库存）

    财务-->>老板: 发送月报 PDF
```

---

## 6. 用户登录 + 权限流程

**业务场景**：4 角色登录 + 看到不同菜单 + 不同操作权限。

```mermaid
sequenceDiagram
    autonumber
    actor 用户 as 用户
    participant FE as 前端
    participant BE as 后端
    participant DB as MariaDB

    用户->>FE: 选角色 + 输密码 + 点登录
    FE->>BE: POST /api/auth/login {username, password}
    BE->>DB: SELECT * FROM users WHERE username=? addSelect('password_hash')
    alt 密码不匹配
        BE-->>FE: 401 "密码错误"
        FE-->>用户: 提示重试
    end

    BE->>BE: bcrypt.compare(input, password_hash)
    BE->>BE: jwt.sign({id, username, role}, JWT_SECRET, {expiresIn: '24h'})
    BE-->>FE: 201 { access_token, user: {id, username, role, full_name, ...} }

    FE->>FE: localStorage.setItem('fsd-token', access_token)
    FE->>FE: zustand.set({user})
    FE->>FE: nav('/', {replace: true})

    Note over 用户,FE: 进入首页 Dashboard

    FE->>BE: GET /api/dashboard/kpi
    Note over FE: request() 自动加 Authorization: Bearer ***
    BE->>BE: JwtAuthGuard 验证签名 + exp
    alt token 无效/过期
        BE-->>FE: 401
        FE->>FE: localStorage.removeItem('fsd-token')
        FE->>用户: 跳登录页
    end
    BE->>BE: 业务逻辑（汇总 KPI）
    BE-->>FE: 200 + KPI 数据

    Note over FE: 渲染侧边栏菜单

    FE->>FE: 根据 user.role 过滤菜单
    Note over FE: boss: 16 菜单<br/>finance: 14<br/>warehouse: 7<br/>sales: 4
    FE-->>用户: 显示对应菜单

    Note over 用户,BE: 用户点 "采购单"

    FE->>FE: route /purchase → PurchasePage
    FE->>BE: GET /api/purchase
    BE->>BE: JwtAuthGuard → RolesGuard(@Roles('boss','finance','warehouse'))
    alt 角色拒绝
        BE-->>FE: 403
    end
    BE-->>FE: 采购单列表
    FE-->>用户: 表格
```

---

## 7. 库存批次流转（采购→销售全链）

```mermaid
flowchart LR
    A[采购单 PO] -->|创建| B[批次 B2026...]
    B -->|入库流水<br/>type=in| C[库存 batches.qty_remaining]
    C -->|销售单 SO| D[批次 qty_remaining 减少]
    D -->|出库流水<br/>type=out| E[客户]
    C -->|调拨| F[其他批次]
    F -->|调拨流水<br/>type=transfer| G[调入批次]
    C -->|损耗| H[盘点]
    H -->|损耗流水<br/>type=loss| I[报损]
    C -->|反冲| J[恢复库存]
    J -->|return 流水| C

    style A fill:#e1f5e1
    style B fill:#cfe2cf
    style C fill:#fff3b0
    style D fill:#ffd6a5
    style E fill:#caffbf
```

---

## 8. 数据完整性（业务"反冲"原则）

```mermaid
mindmap
  root((数据完整性))
    不物理删
      DELETE /sales/:id → 400
      DELETE /finance/transactions/:id → 400
    走反冲
      POST /sales/:id/reverse
        恢复库存
        反向流水
        撤销佣金
        反向收款
        标 status='cancelled'
      POST /finance/transactions/:id/reverse
        写反向 Tx
        标 status='reversed'
        重算 source 单
    已收款禁改
      sales 禁改 qty/price/batch
      仅改备注/收款
    编号并发安全
      order_sequences 表
      SELECT FOR UPDATE 行锁
      唯一约束兜底
    状态机
      SalesOrder: active → cancelled
      PaymentTransaction: active → reversed
      CommissionRecord: pending → paid/cancelled
```

---

## 9. 状态机：销售单

```mermaid
stateDiagram-v2
    [*] --> active: POST /api/sales
    active --> cancelled: POST /api/sales/:id/reverse
    cancelled --> [*]

    note right of active
      字段: qty/sale_price/batch/customer
      已收款 (>0) → 禁改这些
      改备注/收款 OK
    end note

    note right of cancelled
      qty_remaining 已恢复
      收到金额清零
      历史完整保留
      不能再 reverse
    end note
```

---

## 10. 角色权限矩阵

```mermaid
graph TB
    B[boss 老板<br/>16 菜单] --> P1[产品/价格/采购/库存<br/>客户/销售/佣金<br/>财务/账户/设置]
    F[finance 财务<br/>14 菜单] --> P2[采购/库存/客户<br/>销售/佣金/财务<br/>账户/报表]
    W[warehouse 仓管<br/>7 菜单] --> P3[产品/采购/库存<br/>批次/出入库<br/>图片视频]
    S[sales 业务<br/>4 菜单] --> P4[客户/销售/我的佣金]

    P1 --> R1[/internal/health<br/限 boss/]
    P2 --> R2[/api/finance/*<br/]
    P3 --> R3[/api/media/upload<br/限 warehouse+boss/]
    P4 --> R4[/api/sales<br/>限 own/]

    style B fill:#ffd6a5
    style F fill:#caffbf
    style W fill:#bdb2ff
    style S fill:#ffc6ff
```

---

**mermaid 渲染提示**：
- GitHub：直接看 `.md` 文件
- VS Code：装 `Markdown Preview Mermaid Support` 插件
- Typora：原生支持
- 在线：https://mermaid.live/ 粘文本看图
