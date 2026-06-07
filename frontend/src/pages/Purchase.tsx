import { Card, Table, Tag, Space, Button, App, Select, Modal, Form, InputNumber, Input } from 'antd';
import { useEffect, useState, useMemo } from 'react';
import { api } from '@/api/client';
import EditModal, { FieldDef } from '@/components/EditModal';

const STATUS: Record<string, { label: string; color: string }> = {
  done:    { label: '已结清', color: 'success' },
  partial: { label: '部分结', color: 'warning' },
  unpaid:  { label: '未结',   color: 'error' },
};

export default function Purchase() {
  const { message } = App.useApp();
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusF, setStatusF] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [paying, setPaying] = useState<any>(null);
  const [payForm] = Form.useForm();

  const reload = () => {
    setLoading(true);
    Promise.all([api.purchaseOrders(), api.products(), api.suppliers(), api.accounts()])
      .then(([po, p, s, a]) => { setOrders(po); setProducts(p); setSuppliers(s); setAccounts(a); })
      .finally(() => setLoading(false));
  };
  useEffect(reload, []);

  const filtered = useMemo(() => orders.filter(o => !statusF || o.settle_status === statusF), [orders, statusF]);

  const productName = (id: number) => {
    const p = products.find(x => x.id === id);
    return p ? `${p.category} · ${p.factory_code}` : `#${id}`;
  };
  const supplierName = (id: number) => suppliers.find(x => x.id === id)?.name || `#${id}`;
  const remove = async (id: number) => { try { await api.remove('purchase', id); message.success('已删除'); reload(); } catch (e: any) { message.error(e.message); } };

  const fields: FieldDef[] = [
    { name: 'supplier_id', label: '供应商', type: 'select', required: true, options: suppliers.map(s => ({ value: s.id, label: s.name })) },
    { name: 'product_id',  label: '产品',   type: 'select', required: true, options: products.map(p => ({ value: p.id, label: `${p.category} · ${p.factory_code}` })) },
    { name: 'qty',         label: '数量（箱）', type: 'number', required: true, min: 1 },
    { name: 'cost_price',  label: '采购单价',   type: 'number', required: true, min: 0, step: 0.01 },
    { name: 'purchase_date', label: '采购日期', type: 'date' },
    { name: 'paid_amount', label: '已付金额',   type: 'number', min: 0, step: 0.01, initialValue: 0 },
    { name: 'warehouse',   label: '入库仓库',   initialValue: '佛山冷库A' },
    { name: 'holder',      label: '接手人',     initialValue: '黄仓管' },
    { name: 'remark',      label: '备注',       type: 'textarea' },
  ];

  // 付款弹窗
  const openPay = (o: any) => {
    setPaying(o);
    const total = o.qty * o.cost_price;
    payForm.setFieldsValue({
      account_id: accounts.find(a => a.is_company)?.id,
      amount: +(total - o.paid_amount).toFixed(2),
    });
    setPayOpen(true);
  };
  const doPay = async () => {
    const v = await payForm.validateFields();
    try {
      await api.payPurchase(paying.id, v);
      message.success('已登记付款');
      setPayOpen(false);
      reload();
    } catch (e: any) { message.error(e.message); }
  };

  return (
    <Card
      title="采购单管理"
      extra={
        <Space>
          <Select placeholder="结款状态" value={statusF} onChange={setStatusF} allowClear style={{ width: 120 }}>
            <Select.Option value="unpaid">未结</Select.Option>
            <Select.Option value="partial">部分结</Select.Option>
            <Select.Option value="done">已结清</Select.Option>
          </Select>
          <span className="text-ink-3" style={{ fontSize: 12 }}>本月 {filtered.length} 笔</span>
          <Button type="primary" onClick={() => setModalOpen(true)}>+ 新建采购</Button>
        </Space>
      }
    >
      <Table
        size="small"
        loading={loading}
        rowKey="id"
        dataSource={filtered}
        pagination={{ pageSize: 20 }}
        columns={[
          { title: '采购单号', dataIndex: 'po_no', width: 150, render: (v: string) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{v}</span> },
          { title: '供应商', dataIndex: 'supplier_id', width: 180, render: supplierName },
          { title: '产品', dataIndex: 'product_id', width: 200, render: productName },
          { title: '数量', dataIndex: 'qty', width: 80, align: 'right' as const, render: (v: number) => <span style={{ fontFamily: 'var(--font-mono)' }}>{v} 箱</span> },
          { title: '单价', dataIndex: 'cost_price', width: 90, align: 'right' as const, render: (v: number) => <span style={{ fontFamily: 'var(--font-mono)' }}>¥ {v.toFixed(2)}</span> },
          { title: '总额', width: 110, align: 'right' as const, render: (_: any, r: any) => <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>¥ {(r.qty * r.cost_price).toFixed(0)}</span> },
          { title: '已付', dataIndex: 'paid_amount', width: 90, align: 'right' as const, render: (v: number) => <span style={{ fontFamily: 'var(--font-mono)' }}>¥ {v.toFixed(0)}</span> },
          { title: '未付', width: 100, align: 'right' as const, render: (_: any, r: any) => {
            const remain = r.qty * r.cost_price - r.paid_amount;
            return remain > 0 ? <span className="text-burgundy" style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>¥ {remain.toFixed(0)}</span> : <span className="text-moss">—</span>;
          } },
          { title: '采购日期', dataIndex: 'purchase_date', width: 110 },
          { title: '状态', dataIndex: 'settle_status', width: 90, render: (v: string) => { const s = STATUS[v] || { label: v, color: 'default' }; return <Tag color={s.color}>{s.label}</Tag>; } },
          { title: '备注', dataIndex: 'remark', width: 120, ellipsis: true, render: (s: string) => s || '—' },
          { title: '操作', width: 180, align: 'right' as const, fixed: 'right' as const, render: (_: any, r: any) => (
            <Space>
              {r.settle_status !== 'done' && <Button size="small" type="primary" onClick={() => openPay(r)}>付款</Button>}
              <Button size="small" danger onClick={() => remove(r.id)}>删除</Button>
            </Space>
          )},
        ]}
      />
      <EditModal
        open={modalOpen}
        title="新建采购单"
        fields={fields}
        initial={{ purchase_date: new Date().toISOString().slice(0, 10) }}
        onCancel={() => setModalOpen(false)}
        onSubmit={async (v) => {
          await api.create('purchase', v);
          reload();
        }}
      />
      <Modal
        open={payOpen}
        title={`登记付款 · ${paying?.po_no || ''}`}
        onCancel={() => setPayOpen(false)}
        onOk={doPay}
        okText="确认付款"
        cancelText="取消"
      >
        <Form form={payForm} layout="vertical" style={{ paddingTop: 12 }}>
          <Form.Item name="account_id" label="付款账户" rules={[{ required: true }]}>
            <Select options={accounts.map(a => ({ value: a.id, label: a.name }))} />
          </Form.Item>
          <Form.Item name="amount" label="付款金额" rules={[{ required: true }]}>
            <InputNumber min={0.01} step={0.01} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
