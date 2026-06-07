import { Card, Table, Tag, Space, Button, Popconfirm, App, Select } from 'antd';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { useAuth } from '@/store';
import EditModal, { FieldDef } from '@/components/EditModal';

export default function Customers() {
  const nav = useNavigate();
  const { message } = App.useApp();
  const user = useAuth(s => s.user)!;
  const [list, setList] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kw, setKw] = useState('');
  const [typeF, setTypeF] = useState<string>('');
  const [natureF, setNatureF] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const reload = () => {
    setLoading(true);
    Promise.all([api.customers(), api.salesOrders(), api.users()])
      .then(([c, so, u]) => { setList(c); setOrders(so); setUsers(u); })
      .finally(() => setLoading(false));
  };
  useEffect(reload, []);

  const filtered = useMemo(() => {
    let arr = user.role === 'sales' ? list.filter(c => c.sales_user_id === user.id) : list;
    return arr.filter(c => {
      if (kw && !`${c.name} ${c.contact_name} ${c.address}`.toLowerCase().includes(kw.toLowerCase())) return false;
      if (typeF && c.type !== typeF) return false;
      if (natureF && c.nature !== natureF) return false;
      return true;
    });
  }, [list, user, kw, typeF, natureF]);

  const summary = (id: number) => {
    const my = orders.filter(o => o.customer_id === id);
    const total = my.reduce((a, b) => a + b.qty * b.sale_price, 0);
    const received = my.reduce((a, b) => a + b.received_amount, 0);
    return { orderCount: my.length, total, unpaid: total - received };
  };
  const uname = (id: number) => users.find(x => x.id === id)?.full_name || `#${id}`;

  const remove = async (id: number, e: any) => {
    e.stopPropagation();
    try { await api.remove('customers', id); message.success('已删除'); reload(); } catch (e: any) { message.error(e.message); }
  };

  const fields: FieldDef[] = [
    { name: 'name',          label: '客户名称', required: true },
    { name: 'contact_name',  label: '联系人' },
    { name: 'phone',         label: '电话' },
    { name: 'address',       label: '地址' },
    { name: 'type',          label: '客户类型', type: 'select', required: true, options: [
      { value: '加工厂', label: '加工厂' }, { value: '批发商', label: '批发商' }, { value: '商超', label: '商超' }, { value: '餐饮', label: '餐饮' },
    ] },
    { name: 'nature',        label: '客户性质', type: 'select', required: true, options: [
      { value: '国企', label: '国企' }, { value: '个体户', label: '个体户' },
    ] },
    { name: 'sales_user_id', label: '所属业务员', type: 'select', required: true, options: users.filter(u => u.role === 'sales').map(u => ({ value: u.id, label: u.full_name })) },
    { name: 'remark',        label: '备注', type: 'textarea' },
  ];

  return (
    <Card
      title="客户管理"
      extra={
        <Space>
          <input
            placeholder="搜索名称/联系人/地址"
            value={kw}
            onChange={e => setKw(e.target.value)}
            style={{ width: 200, padding: '4px 11px', border: '1px solid var(--line)', borderRadius: 2, background: 'var(--paper)' }}
          />
          <Select placeholder="类型" value={typeF} onChange={setTypeF} allowClear style={{ width: 100 }}>
            {['加工厂','批发商','商超','餐饮'].map(t => <Select.Option key={t} value={t}>{t}</Select.Option>)}
          </Select>
          <Select placeholder="性质" value={natureF} onChange={setNatureF} allowClear style={{ width: 90 }}>
            {['国企','个体户'].map(t => <Select.Option key={t} value={t}>{t}</Select.Option>)}
          </Select>
          <span className="text-ink-3" style={{ fontSize: 12 }}>共 {filtered.length} 个客户</span>
          <Button type="primary" onClick={() => { setEditing(null); setModalOpen(true); }}>+ 新增客户</Button>
        </Space>
      }
    >
      <Table
        size="small"
        loading={loading}
        rowKey="id"
        dataSource={filtered}
        pagination={{ pageSize: 20 }}
        onRow={(r: any) => ({ onClick: () => nav(`/customers/${r.id}`), style: { cursor: 'pointer' } })}
        columns={[
          { title: '客户', dataIndex: 'name', render: (v: string, r: any) => (
            <div>
              <div style={{ fontWeight: 500 }}>{v}</div>
              <div className="text-ink-3" style={{ fontSize: 11 }}>{r.address}</div>
            </div>
          )},
          { title: '联系人', dataIndex: 'contact_name', width: 90, render: (s: string) => s || '—' },
          { title: '电话', dataIndex: 'phone', width: 120, render: (s: string) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{s}</span> },
          { title: '类型', dataIndex: 'type', width: 90, render: (v: string) => <Tag color="processing">{v}</Tag> },
          { title: '性质', dataIndex: 'nature', width: 90, render: (v: string) => <Tag color={v === '国企' ? 'gold' : 'default'}>{v}</Tag> },
          { title: '所属业务员', dataIndex: 'sales_user_id', width: 100, render: uname },
          { title: '订单数', width: 80, align: 'right' as const, render: (_: any, r: any) => summary(r.id).orderCount },
          { title: '累计销售', width: 130, align: 'right' as const, render: (_: any, r: any) => <span style={{ fontFamily: 'var(--font-mono)' }}>¥ {summary(r.id).total.toLocaleString()}</span> },
          { title: '未收款', width: 120, align: 'right' as const, render: (_: any, r: any) => {
            const u = summary(r.id).unpaid;
            return u > 0 ? <span className="text-burgundy" style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>¥ {u.toLocaleString()}</span> : <span className="text-moss">—</span>;
          }},
          { title: '操作', width: 140, align: 'right' as const, fixed: 'right' as const, render: (_: any, r: any) => (
            <Space onClick={e => e.stopPropagation()}>
              <Button size="small" onClick={(e) => { e.stopPropagation(); setEditing(r); setModalOpen(true); }}>编辑</Button>
              <Popconfirm title="删除该客户？" onConfirm={e => remove(r.id, e)}>
                <Button size="small" danger>删除</Button>
              </Popconfirm>
            </Space>
          )},
        ]}
      />
      <EditModal
        open={modalOpen}
        title={editing ? `编辑客户 #${editing.id}` : '新增客户'}
        fields={fields}
        initial={editing || {}}
        onCancel={() => setModalOpen(false)}
        onSubmit={async (v) => {
          if (editing) await api.update('customers', editing.id, v);
          else await api.create('customers', v);
          reload();
        }}
      />
    </Card>
  );
}
