import { Card, Table, Tag, Space, Button, App, Select, Modal, Form, InputNumber } from 'antd';
import { useEffect, useState, useMemo } from 'react';
import { api } from '@/api/client';
import { useAuth } from '@/store';
import EditModal, { FieldDef } from '@/components/EditModal';

const STATUS: Record<string, { label: string; color: string }> = {
  done:    { label: '已收', color: 'success' },
  partial: { label: '部分', color: 'warning' },
  unpaid:  { label: '未收', color: 'error' },
};

export default function Sales() {
  const { message } = App.useApp();
  const user = useAuth(s => s.user)!;
  const [list, setList] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusF, setStatusF] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [recOpen, setRecOpen] = useState(false);
  const [receiving, setReceiving] = useState<any>(null);
  const [recForm] = Form.useForm();

  const reload = () => {
    setLoading(true);
    Promise.all([api.salesOrders(), api.products(), api.customers(), api.inventoryBatches(), api.accounts(), api.users()])
      .then(([so, p, c, b, a, u]) => { setList(so); setProducts(p); setCustomers(c); setBatches(b); setAccounts(a); setUsers(u); })
      .finally(() => setLoading(false));
  };
  useEffect(reload, []);

  const filtered = useMemo(() => {
    let arr = user.role === 'sales' ? list.filter(o => o.sales_user_id === user.id) : list;
    if (statusF) arr = arr.filter(o => o.receive_status === statusF);
    return arr;
  }, [list, user, statusF]);

  const pname = (id: number) => { const p = products.find(x => x.id === id); return p ? `${p.category} · ${p.factory_code}` : `#${id}`; };
  const cname = (id: number) => customers.find(x => x.id === id)?.name || `#${id}`;
  const uname = (id: number) => users.find(x => x.id === id)?.full_name || `#${id}`;

  const totalAmt = filtered.reduce((a, b) => a + b.qty * b.sale_price, 0);
  const totalReceived = filtered.reduce((a, b) => a + b.received_amount, 0);
  const totalUnpaid = totalAmt - totalReceived;

  const fields: FieldDef[] = [
    { name: 'customer_id',  label: '客户', type: 'select', required: true, options: customers.map(c => ({ value: c.id, label: c.name })) },
    { name: 'sales_user_id',label: '业务员', type: 'select', required: true, options: users.filter(u => u.role === 'sales').map(u => ({ value: u.id, label: u.full_name })) },
    { name: 'product_id',   label: '产品', type: 'select', required: true, options: products.map(p => ({ value: p.id, label: `${p.category} · ${p.factory_code}` })) },
    { name: 'batch_id',     label: '批次', type: 'select', required: true,
      options: batches.filter(b => b.qty_remaining > 0).map(b => ({ value: b.id, label: `${b.batch_no} (剩 ${b.qty_remaining} 箱)` })) },
    { name: 'qty',          label: '数量（箱）', type: 'number', required: true, min: 1 },
    { name: 'sale_price',   label: '销售单价', type: 'number', required: true, min: 0, step: 0.01 },
    { name: 'tax_rate',     label: '税率', type: 'select', options: [{ value: 1, label: '1% 农副' }, { value: 9, label: '9% 一般' }] },
    { name: 'commission_rate', label: '佣金比例(%)', type: 'number', min: 0, step: 0.1 },
    { name: 'sale_date',    label: '销售日期', type: 'date' },
    { name: 'received_amount', label: '已收金额', type: 'number', min: 0, step: 0.01, initialValue: 0 },
    { name: 'account_id',   label: '收款账户（若已收款）', type: 'select', options: accounts.map(a => ({ value: a.id, label: a.name })) },
    { name: 'remark',       label: '备注', type: 'textarea' },
  ];

  // 收款
  const openReceive = (o: any) => {
    setReceiving(o);
    recForm.setFieldsValue({
      account_id: accounts[0]?.id,
      amount: +(o.qty * o.sale_price - o.received_amount).toFixed(2),
    });
    setRecOpen(true);
  };
  const doReceive = async () => {
    const v = await recForm.validateFields();
    try {
      await api.receiveSale(receiving.id, v);
      message.success('已登记收款');
      setRecOpen(false);
      reload();
    } catch (e: any) { message.error(e.message); }
  };

  return (
    <Card
      title={user.role === 'sales' ? '我的销售' : '销售记录'}
      extra={
        <Space>
          <Select placeholder="收款状态" value={statusF} onChange={setStatusF} allowClear style={{ width: 110 }}>
            <Select.Option value="unpaid">未收</Select.Option>
            <Select.Option value="partial">部分</Select.Option>
            <Select.Option value="done">已收</Select.Option>
          </Select>
          <Button type="primary" onClick={() => setModalOpen(true)}>+ 新建销售</Button>
        </Space>
      }
    >
      <div style={{ display: 'flex', gap: 24, marginBottom: 16, padding: '12px 16px', background: 'var(--paper-2)' }}>
        <div><div className="text-ink-3" style={{ fontSize: 11, letterSpacing: '0.1em' }}>销售总额</div><div className="num-display">¥ {totalAmt.toLocaleString()}</div></div>
        <div><div className="text-ink-3" style={{ fontSize: 11, letterSpacing: '0.1em' }}>已收款</div><div className="num-display moss">¥ {totalReceived.toLocaleString()}</div></div>
        <div><div className="text-ink-3" style={{ fontSize: 11, letterSpacing: '0.1em' }}>未收款</div><div className="num-display burgundy">¥ {totalUnpaid.toLocaleString()}</div></div>
      </div>
      <Table
        size="small"
        loading={loading}
        rowKey="id"
        dataSource={filtered}
        pagination={{ pageSize: 20 }}
        columns={[
          { title: '销售单号', dataIndex: 'so_no', width: 140, render: (v: string) => <span style={{ fontFamily: 'var(--font-mono)' }}>{v}</span> },
          { title: '客户', dataIndex: 'customer_id', width: 170, render: cname },
          { title: '业务员', dataIndex: 'sales_user_id', width: 90, render: uname },
          { title: '产品', dataIndex: 'product_id', width: 180, render: pname },
          { title: '数量', dataIndex: 'qty', width: 80, align: 'right' as const, render: (v: number) => `${v} 箱` },
          { title: '单价', dataIndex: 'sale_price', width: 90, align: 'right' as const, render: (v: number) => <span style={{ fontFamily: 'var(--font-mono)' }}>¥ {v.toFixed(2)}</span> },
          { title: '总额', width: 110, align: 'right' as const, render: (_: any, r: any) => <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>¥ {(r.qty * r.sale_price).toFixed(0)}</span> },
          { title: '税率', dataIndex: 'tax_rate', width: 80, render: (v: number) => <Tag color={v === 1 ? 'gold' : 'blue'}>{v}%</Tag> },
          { title: '佣金', dataIndex: 'commission_amt', width: 100, align: 'right' as const, render: (v: number, r: any) => <span style={{ fontFamily: 'var(--font-mono)' }}>¥ {v.toFixed(2)}<span className="text-ink-3" style={{ fontSize: 10 }}> ({r.commission_rate}%)</span></span> },
          { title: '日期', dataIndex: 'sale_date', width: 110 },
          { title: '状态', dataIndex: 'receive_status', width: 80, render: (v: string) => <Tag color={STATUS[v]?.color}>{STATUS[v]?.label || v}</Tag> },
          { title: '操作', width: 120, align: 'right' as const, fixed: 'right' as const, render: (_: any, r: any) => (
            r.receive_status !== 'done' ? <Button size="small" type="primary" onClick={() => openReceive(r)}>收款</Button> : <span className="text-moss">已完成</span>
          )},
        ]}
      />
      <EditModal
        open={modalOpen}
        title="新建销售单"
        fields={fields}
        initial={{ tax_rate: 1, sale_date: new Date().toISOString().slice(0, 10) }}
        onCancel={() => setModalOpen(false)}
        onSubmit={async (v) => {
          // 提交时附 customer_name 用于 counter_party
          const c = customers.find(x => x.id === +v.customer_id);
          await api.create('sales', { ...v, counter_party: c?.name });
          reload();
        }}
      />
      <Modal
        open={recOpen}
        title={`登记收款 · ${receiving?.so_no || ''}`}
        onCancel={() => setRecOpen(false)}
        onOk={doReceive}
        okText="确认收款"
        cancelText="取消"
      >
        <Form form={recForm} layout="vertical" style={{ paddingTop: 12 }}>
          <Form.Item name="account_id" label="收款账户" rules={[{ required: true }]}>
            <Select options={accounts.map(a => ({ value: a.id, label: a.name }))} />
          </Form.Item>
          <Form.Item name="amount" label="收款金额" rules={[{ required: true }]}>
            <InputNumber min={0.01} step={0.01} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
