// FinanceService — 账户/流水业务逻辑
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PaymentAccount } from '../entities/payment-account.entity';
import { PaymentTransaction } from '../entities/payment-transaction.entity';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { SalesOrder } from '../entities/sales-order.entity';
import { CreateAccountDto, UpdateAccountDto, CreateTransactionDto } from '../dto/finance-media.dto';

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(PaymentAccount) private accountRepo: Repository<PaymentAccount>,
    @InjectRepository(PaymentTransaction) private txRepo: Repository<PaymentTransaction>,
    private ds: DataSource,
  ) {}

  // === 账户 ===
  listAccounts() { return this.accountRepo.find({ order: { id: 'ASC' } }); }

  async getAccount(id: number) {
    const a = await this.accountRepo.findOne({ where: { id } });
    if (!a) throw new NotFoundException();
    return a;
  }

  createAccount(body: CreateAccountDto) {
    return this.accountRepo.save(this.accountRepo.create(body as any));
  }

  async updateAccount(id: number, body: UpdateAccountDto) {
    await this.accountRepo.update(id, body as any);
    return this.accountRepo.findOne({ where: { id } });
  }

  async removeAccount(id: number) {
    await this.accountRepo.delete(id);
    return { ok: true };
  }

  // === 流水 ===
  listTx(direction?: string) {
    return direction
      ? this.txRepo.find({ where: { direction: direction as any }, order: { id: 'ASC' } })
      : this.txRepo.find({ order: { id: 'ASC' } });
  }

  listReceive() { return this.txRepo.find({ where: { direction: 'in' }, order: { id: 'ASC' } }); }
  listPay() { return this.txRepo.find({ where: { direction: 'out' }, order: { id: 'ASC' } }); }

  createTx(body: CreateTransactionDto) {
    return this.txRepo.save(this.txRepo.create(body as any));
  }

  /**
   * 反冲流水：写反向 Tx + 标原 Tx reversed + 重算 source 单的 paid/received + settle_status
   */
  async reverseTx(id: number, body: { reason?: string }) {
    return this.ds.transaction(async mgr => {
      const orig = await mgr.findOne(PaymentTransaction, { where: { id } });
      if (!orig) throw new NotFoundException('流水不存在');
      if (orig.status === 'reversed') throw new BadRequestException('该流水已反冲');

      const reverse = await mgr.save(mgr.create(PaymentTransaction, {
        account_id: orig.account_id,
        direction: orig.direction === 'in' ? 'out' : 'in',
        amount: orig.amount,
        source_type: `${orig.source_type}_reverse` as any,
        ref_order_id: orig.ref_order_id,
        ref_order_no: `RV-${orig.ref_order_no || orig.id}`,
        counter_party: orig.counter_party,
        operator_id: orig.operator_id,
        remark: `反冲 #${orig.id} (${body.reason || orig.remark || ''})`,
      }));

      await mgr.update(PaymentTransaction, id, {
        status: 'reversed',
        reversed_by_tx_id: reverse.id,
      });

      // 重算 source 单
      if (orig.source_type === 'purchase' && orig.ref_order_id) {
        const po = await mgr.findOne(PurchaseOrder, { where: { id: orig.ref_order_id } });
        if (po) {
          const newPaid = Math.max(0, po.paid_amount - orig.amount);
          const total = po.qty * po.cost_price;
          const newStatus = newPaid === 0 ? 'unpaid' : newPaid >= total ? 'done' : 'partial';
          await mgr.update(PurchaseOrder, po.id, { paid_amount: newPaid, settle_status: newStatus });
        }
      } else if (orig.source_type === 'sale' && orig.ref_order_id) {
        const so = await mgr.findOne(SalesOrder, { where: { id: orig.ref_order_id } });
        if (so) {
          const newReceived = Math.max(0, so.received_amount - orig.amount);
          const total = so.qty * so.sale_price;
          const newStatus = newReceived === 0 ? 'unpaid' : newReceived >= total ? 'done' : 'partial';
          await mgr.update(SalesOrder, so.id, { received_amount: newReceived, receive_status: newStatus });
        }
      }
      return { ok: true, reversed: reverse };
    });
  }
}
