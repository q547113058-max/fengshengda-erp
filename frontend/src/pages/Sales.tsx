import { Card, Table, Tag, Space, Button, App, Select, Modal, Form, InputNumber, Input } from 'antd';
import { useEffect, useState, useMemo } from 'react';
import { api } from '@/api/client';
import { useAuth } from '@/store';

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
  const [monthF, setMonthF] = useState<string>('');
  const [customerF, setCustomerF] = useState<number | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [modalOpen, setModalOpen] = useState(false);
  const [recOpen, setRecOpen] = useState(false);
  const [receiving, setReceiving] = useState<any>(null);
  const [recForm] = Form.useForm();
  const [saleForm] = Form.useForm();
  const [selectedQty, setSelectedQty] = useState<number>(1);

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
    if (monthF) arr = arr.filter(o => o.sale_date?.startsWith(monthF));
    if (customerF) arr = arr.filter(o => o.customer_id === customerF);
    return arr;
  }, [list, user, statusF, monthF, customerF]);

  const pname = (id: number) => { const p = products.find(x => x.id === id); return p ? `${p.category} · ${p.factory_code}` : `#${id}`; };
  const cname = (id: number) => customers.find(x => x.id === id)?.name || `#${id}`;
  const uname = (id: number) => users.find(x => x.id === id)?.full_name || `#${id}`;

  const totalAmt = filtered.reduce((a, b) => a + b.qty * b.sale_price, 0);
  const totalReceived = filtered.reduce((a, b) => a + b.received_amount, 0);
  const totalUnpaid = totalAmt - totalReceived;

  const fields: any[] = [];

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
          <Select
            placeholder="按月份"
            value={monthF || undefined}
            onChange={setMonthF}
            allowClear
            style={{ width: 130 }}
            showSearch
            filterOption={(input, option) => String(option?.label ?? '').includes(input)}
          >
            {Array.from(new Set(list.map(o => o.sale_date?.slice(0, 7)).filter(Boolean)))
              .sort()
              .reverse()
              .map(m => (
                <Select.Option key={m} value={m} label={m}>
                  {m}
                </Select.Option>
              ))}
          </Select>
          <Select
            placeholder="按客户"
            value={customerF ?? undefined}
            onChange={setCustomerF}
            allowClear
            style={{ width: 160 }}
            showSearch
            filterOption={(input, option) => String(option?.label ?? '').includes(input)}
            options={customers.map(c => ({ value: c.id, label: c.name }))}
          />
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
          { title: '数量', dataIndex: 'qty', width: 80, align: 'right' as const, render: (v: number) => `${v} 吨` },
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
      <Modal
        open={modalOpen}
        title="新建销售单"
        onCancel={() => { setModalOpen(false); }}
        onOk={async () => {
          try {
            const v = await saleForm.validateFields();
            const c = customers.find(x => x.id === +v.customer_id);
            await api.create('sales', {
              ...v,
              sales_user_id: user.id,
              counter_party: c?.name,
              sale_date: v.sale_date?.format('YYYY-MM-DD'),
              batch_id: null,
            });
            saleForm.resetFields();
            setModalOpen(false);
            reload();
          } catch (e: any) {
            if (e?.errorFields) return;
            message.error(e?.message || '保存失败');
          }
        }}
        okText="保存"
        cancelText="取消"
        destroyOnHidden
        width={620}
      >
        <Form form={saleForm} layout="vertical" style={{ paddingTop: 12 }}>
          <Form.Item name="customer_id" label="客户" rules={[{ required: true, message: '请选择客户' }]}>
            <Select placeholder="请选择客户" showSearch filterOption={(i, o) => String(o?.label ?? '').includes(i)} options={customers.map(c => ({ value: c.id, label: c.name }))} />
          </Form.Item>

          <Form.Item name="product_id" label="产品" rules={[{ required: true, message: '请选择产品' }]}>
            <Select
              placeholder="请选择产品"
              showSearch
              filterOption={(i, o) => String(o?.label ?? '').includes(i)}
              options={products.map(p => ({ value: p.id, label: `${p.category} · ${p.factory_code}` }))}
              onChange={(val) => { saleForm.setFieldsValue({ sale_price: undefined }); }}
            />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.product_id !== curr.product_id}>
            {({ getFieldValue }) => {
              const pid = getFieldValue('product_id');
              const product = products.find(p => p.id === pid);
              const priceOptions = product?.prices?.length
                ? product.prices.map((px: any) => ({ value: px.price, label: `¥${px.price.toFixed(2)}${px.remark ? ` — ${px.remark}` : ''}` }))
                : [];
              return (
                <Form.Item name="sale_price" label="销售单价" rules={[{ required: true, message: '请选择或输入单价' }]}>
                  <Select
                    placeholder="请选择报价或输入单价"
                    showSearch
                    allowClear
                    filterOption={(i, o) => String(o?.label ?? '').includes(i)}
                    options={priceOptions}
                    onChange={(val) => { if (val) { setSelectedQty(getFieldValue('qty') || 1); } }}
                    dropdownRender={(menu) => (
                      <>
                        {menu}
                        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--line)', color: 'var(--ink-3)', fontSize: 12 }}>
                          或直接输入任意单价
                        </div>
                      </>
                    )}
                  />
                </Form.Item>
              );
            }}
          </Form.Item>
          <Form.Item name="qty" label="数量（吨）" rules={[{ required: true, message: '请输入数量' }]} initialValue={1}>
            <InputNumber min={1} style={{ width: '100%' }} onChange={(val) => setSelectedQty(val || 1)} />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.qty !== curr.qty || prev.sale_price !== curr.sale_price}>
            {({ getFieldValue }) => {
              const qty = getFieldValue('qty') || 0;
              const price = getFieldValue('sale_price') || 0;
              const receivable = qty * price;
              return (
                <Form.Item label="应收金额">
                  <Input value={receivable > 0 ? `¥ ${receivable.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'} disabled style={{ color: 'var(--copper)', fontWeight: 600 }} />
                </Form.Item>
              );
            }}
          </Form.Item>
          <Form.Item name="sale_date" label="销售日期" initialValue={today}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="可选" />
          </Form.Item>
        </Form>
      </Modal>
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
