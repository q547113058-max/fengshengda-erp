import { Card, Table, Tag, Space, Button, Popconfirm, App } from 'antd';
import { useEffect, useState } from 'react';
import { useAuth } from '@/store';
import { api } from '@/api/client';
import EditModal, { FieldDef } from '@/components/EditModal';

export default function Suppliers() {
  const { message } = App.useApp();
  const user = useAuth(s => s.user)!;
  const canEdit = user.role !== 'finance';
  const canSeeContact = user.role === 'boss' || user.role === 'finance'; // 仓储看不到电话
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const reload = () => {
    setLoading(true);
    Promise.all([api.suppliers(), api.purchaseOrders()])
      .then(([s, po]) => { setSuppliers(s); setOrders(po); })
      .finally(() => setLoading(false));
  };
  useEffect(reload, []);

  const summary = (id: number) => {
    const my = orders.filter(o => o.supplier_id === id);
    return { count: my.length, total: my.reduce((a, b) => a + b.qty * b.cost_price, 0), unpaid: my.reduce((a, b) => a + b.qty * b.cost_price - b.paid_amount, 0) };
  };

  const remove = async (id: number, e: any) => {
    e.stopPropagation();
    try { await api.remove('suppliers', id); message.success('已删除'); reload(); } catch (e: any) { message.error(e.message); }
  };

  const fields: FieldDef[] = [
    { name: 'name',         label: '供应商名称', required: true },
    { name: 'contact_name', label: '联系人' },
    { name: 'phone',        label: '电话' },
    { name: 'address',      label: '地址' },
    { name: 'settle_type',  label: '结款方式', type: 'select', options: [
      { value: '现款', label: '现款' }, { value: '月结30天', label: '月结30天' }, { value: '月结45天', label: '月结45天' }, { value: '货到付款', label: '货到付款' },
    ] },
    { name: 'remark',       label: '备注', type: 'textarea' },
  ];

  return (
    <Card
      title="供应商管理"
      extra={canEdit && <Button type="primary" onClick={() => { setEditing(null); setModalOpen(true); }}>+ 新增供应商</Button>}
    >
      <Table
        size="small"
        loading={loading}
        rowKey="id"
        dataSource={suppliers}
        pagination={false}
        expandable={{
          expandedRowRender: (r: any) => (
            <div style={{ padding: 8, color: 'var(--ink-2)' }}>
              联系人：{r.contact_name || '—'}{canSeeContact ? <> · 电话：<span style={{ fontFamily: 'var(--font-mono)' }}>{r.phone || '—'}</span></> : ''} · 地址：{r.address || '—'} · 结款：<Tag color="processing">{r.settle_type}</Tag> · 备注：{r.remark || '—'}
            </div>
          ),
        }}
        columns={[
          { title: '供应商', dataIndex: 'name', render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span> },
          { title: '联系人', dataIndex: 'contact_name', width: 110, render: (s: string) => s || '—' },
          ...(canSeeContact ? [{ title: '电话', dataIndex: 'phone', width: 130, render: (s: string) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{s || '—'}</span> }] : []),
          { title: '结款方式', dataIndex: 'settle_type', width: 110, render: (v: string) => <Tag color="processing">{v}</Tag> },
          { title: '采购单', width: 80, align: 'right' as const, render: (_: any, r: any) => summary(r.id).count },
          { title: '累计采购', width: 130, align: 'right' as const, render: (_: any, r: any) => <span style={{ fontFamily: 'var(--font-mono)' }}>¥ {summary(r.id).total.toLocaleString()}</span> },
          { title: '未付金额', width: 130, align: 'right' as const, render: (_: any, r: any) => {
            const u = summary(r.id).unpaid;
            return u > 0 ? <span className="text-burgundy" style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>¥ {u.toLocaleString()}</span> : <span className="text-moss">¥ 0</span>;
          } },
          { title: '操作', width: 140, align: 'right' as const, fixed: 'right' as const, render: (_: any, r: any) => !canEdit ? null : (
            <Space onClick={e => e.stopPropagation()}>
              <Button size="small" onClick={() => { setEditing(r); setModalOpen(true); }}>编辑</Button>
              <Popconfirm title="删除该供应商？" onConfirm={e => remove(r.id, e)}>
                <Button size="small" danger>删除</Button>
              </Popconfirm>
            </Space>
          )},
        ]}
      />
      <EditModal
        open={modalOpen}
        title={editing ? `编辑供应商 #${editing.id}` : '新增供应商'}
        fields={fields}
        initial={editing || {}}
        onCancel={() => setModalOpen(false)}
        onSubmit={async (v) => {
          if (editing) await api.update('suppliers', editing.id, v);
          else await api.create('suppliers', v);
          reload();
        }}
      />
    </Card>
  );
}
