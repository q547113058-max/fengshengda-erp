import { Card, Table, Tag, Space, Button, Segmented, App, Modal, Form, Select, InputNumber } from 'antd';
import { useEffect, useState } from 'react';
import { api } from '@/api/client';

const STATUS: Record<string, { label: string; color: string }> = {
  paid: { label: '已结算', color: 'success' },
  pending: { label: '待结算', color: 'warning' },
};

export default function Commission() {
  const { message } = App.useApp();
  const [list, setList] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState<any>(null);
  const [form] = Form.useForm();

  const reload = () => {
    setLoading(true);
    Promise.all([api.commissions(status || undefined), api.users(), api.accounts()])
      .then(([c, u, a]) => { setList(c); setUsers(u); setAccounts(a); })
      .finally(() => setLoading(false));
  };
  useEffect(reload, [status]);

  const uname = (id: number) => users.find(x => x.id === id)?.full_name || `#${id}`;
  const totalAmt = list.reduce((a, b) => a + b.amount, 0);
  const paidAmt = list.filter(x => x.settle_status === 'paid').reduce((a, b) => a + b.amount, 0);
  const pendingAmt = totalAmt - paidAmt;

  const openSettle = (r: any) => {
    setSettling(r);
    form.setFieldsValue({
      account_id: accounts[0]?.id,
      counter_party: uname(r.sales_user_id),
    });
  };
  const doSettle = async () => {
    const v = await form.validateFields();
    try {
      await api.settleCommission(settling.id, v);
      message.success('已结算');
      setSettling(null);
      reload();
    } catch (e: any) { message.error(e.message); }
  };

  return (
    <Card
      title="佣金结算"
      extra={
        <Space>
          <Segmented value={status} onChange={(v: any) => setStatus(v)}
            options={[{ label: '全部', value: '' }, { label: '待结算', value: 'pending' }, { label: '已结算', value: 'paid' }]} />
        </Space>
      }
    >
      <div style={{ display: 'flex', gap: 24, marginBottom: 16, padding: '12px 16px', background: 'var(--paper-2)' }}>
        <div><div className="text-ink-3" style={{ fontSize: 11, letterSpacing: '0.1em' }}>佣金总额</div><div className="num-display">¥ {totalAmt.toFixed(2)}</div></div>
        <div><div className="text-ink-3" style={{ fontSize: 11, letterSpacing: '0.1em' }}>已结算</div><div className="num-display moss">¥ {paidAmt.toFixed(2)}</div></div>
        <div><div className="text-ink-3" style={{ fontSize: 11, letterSpacing: '0.1em' }}>待结算</div><div className="num-display burgundy">¥ {pendingAmt.toFixed(2)}</div></div>
      </div>
      <Table
        size="small"
        loading={loading}
        rowKey="id"
        dataSource={list}
        pagination={{ pageSize: 20 }}
        columns={[
          { title: '业务员', dataIndex: 'sales_user_id', width: 110, render: uname },
          { title: '关联销售单', dataIndex: 'sales_order_id', render: (id: number) => <span style={{ fontFamily: 'var(--font-mono)' }}>SO#{id}</span> },
          { title: '佣金比例', dataIndex: 'rate', width: 110, align: 'right' as const, render: (v: number) => <span style={{ fontFamily: 'var(--font-mono)' }}>{v}%</span> },
          { title: '佣金金额', dataIndex: 'amount', width: 130, align: 'right' as const, render: (v: number) => <span className="text-copper" style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>¥ {v.toFixed(2)}</span> },
          { title: '状态', dataIndex: 'settle_status', width: 100, render: (v: string) => <Tag color={STATUS[v]?.color}>{STATUS[v]?.label || v}</Tag> },
          { title: '结算时间', dataIndex: 'settled_at', width: 160, render: (v: string) => v ? new Date(v).toLocaleString() : '—' },
          { title: '操作', width: 110, align: 'right' as const, fixed: 'right' as const, render: (_: any, r: any) =>
            r.settle_status === 'pending' ? <Button size="small" type="primary" onClick={() => openSettle(r)}>结算</Button> : <span className="text-ink-3">已完成</span>
          },
        ]}
      />
      <Modal
        open={!!settling}
        title={`佣金结算 · ¥${settling?.amount?.toFixed(2)}`}
        onCancel={() => setSettling(null)}
        onOk={doSettle}
        okText="确认结算"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ paddingTop: 12 }}>
          <Form.Item name="account_id" label="付款账户" rules={[{ required: true }]}>
            <Select options={accounts.map(a => ({ value: a.id, label: a.name }))} />
          </Form.Item>
          <Form.Item name="counter_party" label="收款人" rules={[{ required: true }]}>
            <input style={{ width: '100%', padding: '4px 11px', border: '1px solid var(--line)', borderRadius: 2 }} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
