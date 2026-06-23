import { Card, Table, Tag, Space, Button, Popconfirm, App, Select, Modal, Form, Input, Checkbox } from 'antd';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { useAuth } from '@/store';

const TYPES = ['国企', '贸易商', '商超', '加工厂', '餐饮'];

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
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const reload = () => {
    setLoading(true);
    Promise.all([api.customers(), api.salesOrders(), api.users()])
      .then(([c, so, u]) => { setList(c); setOrders(so); setUsers(u); })
      .finally(() => setLoading(false));
  };
  useEffect(reload, []);

  const filtered = useMemo(() => {
    let arr = user.role === 'sales'
      ? list.filter(c =>
          c.sales_user_id === user.id ||
          (c.shared_to_user_ids
            ? c.shared_to_user_ids.split(',').map(Number).includes(user.id)
              || c.shared_to_user_ids === String(user.id)
            : false)
        )
      : list;
    return arr.filter(c => {
      if (kw && !`${c.name} ${c.contact_name} ${c.address}`.toLowerCase().includes(kw.toLowerCase())) return false;
      if (typeF && c.type !== typeF) return false;
      return true;
    });
  }, [list, user, kw, typeF]);

  const summary = (id: number) => {
    const my = orders.filter(o => o.customer_id === id);
    const total = my.reduce((a, b) => a + b.qty * b.sale_price, 0);
    const received = my.reduce((a, b) => a + b.received_amount, 0);
    return { orderCount: my.length, total, unpaid: total - received };
  };

  const uname = (id: number) => users.find(x => x.id === id)?.full_name || `#${id}`;
  const unameOrDash = (id: number | null | undefined) => id ? uname(id) : '—';

  const handleOpen = (cust?: any) => {
    setEditing(cust || null);
    form.resetFields();
    if (cust) {
      form.setFieldsValue({
        name: cust.name,
        contact_name: cust.contact_name,
        phone: cust.phone,
        address: cust.address,
        type: cust.type,
        sales_user_id: cust.sales_user_id,
        shared_to_user_ids: cust.shared_to_user_ids ? cust.shared_to_user_ids.split(',').map(Number) : [],
        remark: cust.remark,
      });
    } else {
      form.setFieldsValue({ shared_to_user_ids: [] });
    }
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const v = await form.validateFields();
      setSubmitting(true);
      if (editing) {
        await api.update('customers', editing.id, v);
        message.success('已更新');
      } else {
        const result: any = await api.create('customers', v);
        if (result._warning) {
          message.warning(result._warning);
        } else {
          message.success('已新建');
        }
      }
      setModalOpen(false);
      form.resetFields();
      reload();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e?.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: number, e: any) => {
    e.stopPropagation();
    try { await api.remove('customers', id); message.success('已删除'); reload(); } catch (e: any) { message.error(e.message); }
  };

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
            {TYPES.map(t => <Select.Option key={t} value={t}>{t}</Select.Option>)}
          </Select>
          <span className="text-ink-3" style={{ fontSize: 12 }}>共 {filtered.length} 个客户</span>
          <Button type="primary" onClick={() => handleOpen()}>+ 新增客户</Button>
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
          { title: '编号', dataIndex: 'code', width: 130, render: (v: string) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{v}</span> },
          { title: '客户', dataIndex: 'name', render: (v: string, r: any) => (
            <div>
              <div style={{ fontWeight: 500 }}>{v}</div>
              <div className="text-ink-3" style={{ fontSize: 11 }}>{r.address}</div>
            </div>
          )},
          { title: '联系人', dataIndex: 'contact_name', width: 90, render: (s: string) => s || '—' },
          { title: '电话', dataIndex: 'phone', width: 120, render: (s: string) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{s}</span> },
          { title: '类型', dataIndex: 'type', width: 80, render: (v: string) => <Tag color="processing">{v}</Tag> },
          { title: '所属业务员', dataIndex: 'sales_user_id', width: 100, render: (id: number) => uname(id) },
          { title: '共享', dataIndex: 'shared_to_user_ids', width: 120, render: (v: string) => {
            if (!v) return <span className="text-ink-3">—</span>;
            const names = v.split(',').map(id => uname(+id)).filter(Boolean);
            return names.length ? <Tag color="green">{names.join(', ')}</Tag> : <span className="text-ink-3">—</span>;
          } },
          { title: '订单数', width: 80, align: 'right' as const, render: (_: any, r: any) => summary(r.id).orderCount },
          { title: '累计销售', width: 130, align: 'right' as const, render: (_: any, r: any) => <span style={{ fontFamily: 'var(--font-mono)' }}>¥ {summary(r.id).total.toLocaleString()}</span> },
          { title: '未收款', width: 120, align: 'right' as const, render: (_: any, r: any) => {
            const u = summary(r.id).unpaid;
            return u > 0 ? <span className="text-burgundy" style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>¥ {u.toLocaleString()}</span> : <span className="text-moss">—</span>;
          }},
          { title: '操作', width: 140, align: 'right' as const, fixed: 'right' as const, render: (_: any, r: any) => (
            <Space onClick={e => e.stopPropagation()}>
              <Button size="small" onClick={(e) => { e.stopPropagation(); handleOpen(r); }}>编辑</Button>
              <Popconfirm title="删除该客户？" onConfirm={e => remove(r.id, e)}>
                <Button size="small" danger>删除</Button>
              </Popconfirm>
            </Space>
          )},
        ]}
      />
      <Modal
        open={modalOpen}
        title={editing ? `编辑客户 #${editing.code}` : '新增客户'}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={handleSubmit}
        okText="保存"
        cancelText="取消"
        destroyOnHidden
        width={560}
        confirmLoading={submitting}
      >
        <Form form={form} layout="vertical" style={{ paddingTop: 12 }}>
          <Form.Item name="name" label="客户名称" rules={[{ required: true, message: '请输入客户名称' }]}>
            <Input placeholder="请输入客户名称（关键字段）" />
          </Form.Item>
          <Form.Item name="contact_name" label="联系人">
            <Input placeholder="可选" />
          </Form.Item>
          <Form.Item name="phone" label="电话">
            <Input placeholder="可选" />
          </Form.Item>
          <Form.Item name="address" label="地址">
            <Input placeholder="可选" />
          </Form.Item>
          <Form.Item name="type" label="客户类型" rules={[{ required: true, message: '请选择类型' }]} initialValue="贸易商">
            <Select placeholder="请选择客户类型">
              {TYPES.map(t => <Select.Option key={t} value={t}>{t}</Select.Option>)}
            </Select>
          </Form.Item>
          {editing && (user.role === 'boss' || editing.sales_user_id === user.id) && (
            <Form.Item name="sales_user_id" label="所属权转移">
              <Select placeholder="变更所属业务员">
                {users.filter(u => u.role === 'sales').map(u => <Select.Option key={u.id} value={u.id}>{u.full_name}</Select.Option>)}
              </Select>
            </Form.Item>
          )}
          <Form.Item name="shared_to_user_ids" label="共享给">
            <Checkbox.Group options={users.filter(u => u.role === 'sales').map(u => ({ value: u.id, label: u.full_name }))} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="可选" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
