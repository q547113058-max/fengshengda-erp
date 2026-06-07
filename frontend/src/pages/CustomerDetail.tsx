import { Card, Descriptions, Tabs, Table, Tag, Empty, Space } from 'antd';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/api/client';

const RECEIVE_STATUS: Record<string, { label: string; color: string }> = {
  done: { label: '已收', color: 'success' },
  partial: { label: '部分', color: 'warning' },
  unpaid: { label: '未收', color: 'error' },
};

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [customer, setCustomer] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [tx, setTx] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.one('customers', id),
      api.salesOrders(),
      api.products(),
      api.users(),
      api.transactions('in'),
    ]).then(([c, so, p, u, t]: any) => {
      setCustomer(c);
      setOrders(so.filter((o: any) => o.customer_id === +id!));
      setProducts(p);
      setUsers(u);
      setTx(t.filter((x: any) => x.counter_party === c?.name));
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Card loading />;
  if (!customer) return <Empty description="客户不存在" />;

  const totalAmt = orders.reduce((a, b) => a + b.qty * b.sale_price, 0);
  const totalReceived = orders.reduce((a, b) => a + b.received_amount, 0);
  const totalUnpaid = totalAmt - totalReceived;
  const uname = (uid: number) => users.find(x => x.id === uid)?.full_name || `#${uid}`;
  const pname = (pid: number) => {
    const p = products.find(x => x.id === pid);
    return p ? `${p.category} · ${p.factory_code}` : `#${pid}`;
  };

  return (
    <Card
      title={
        <span>
          <a onClick={() => nav('/customers')} style={{ color: 'var(--ink-3)', marginRight: 12 }}>← 客户</a>
          {customer.name}
        </span>
      }
    >
      <Descriptions column={3} bordered size="small">
        <Descriptions.Item label="客户名称">{customer.name}</Descriptions.Item>
        <Descriptions.Item label="联系人">{customer.contact_name || '—'}</Descriptions.Item>
        <Descriptions.Item label="电话">{customer.phone || '—'}</Descriptions.Item>
        <Descriptions.Item label="地址" span={2}>{customer.address || '—'}</Descriptions.Item>
        <Descriptions.Item label="客户类型"><Tag color="processing">{customer.type}</Tag></Descriptions.Item>
        <Descriptions.Item label="客户性质"><Tag color={customer.nature === '国企' ? 'gold' : 'default'}>{customer.nature}</Tag></Descriptions.Item>
        <Descriptions.Item label="所属业务员">{uname(customer.sales_user_id)}</Descriptions.Item>
        <Descriptions.Item label="备注" span={3}>{customer.remark || '—'}</Descriptions.Item>
      </Descriptions>

      <div style={{ display: 'flex', gap: 24, marginTop: 24, padding: '12px 16px', background: 'var(--paper-2)' }}>
        <div>
          <div className="text-ink-3" style={{ fontSize: 11, letterSpacing: '0.1em' }}>购买总额</div>
          <div className="num-display">¥ {totalAmt.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-ink-3" style={{ fontSize: 11, letterSpacing: '0.1em' }}>已收款</div>
          <div className="num-display moss">¥ {totalReceived.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-ink-3" style={{ fontSize: 11, letterSpacing: '0.1em' }}>未收款</div>
          <div className="num-display burgundy">¥ {totalUnpaid.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-ink-3" style={{ fontSize: 11, letterSpacing: '0.1em' }}>订单数</div>
          <div className="num-display">{orders.length}</div>
        </div>
      </div>

      <Tabs
        style={{ marginTop: 24 }}
        items={[
          {
            key: 'orders', label: `购买历史（${orders.length}）`,
            children: orders.length === 0 ? <Empty /> : (
              <Table
                size="small"
                rowKey="id"
                dataSource={orders}
                pagination={false}
                columns={[
                  { title: '日期', dataIndex: 'sale_date' },
                  { title: '销售单号', dataIndex: 'so_no', render: (v: string) => <span style={{ fontFamily: 'var(--font-mono)' }}>{v}</span> },
                  { title: '产品', dataIndex: 'product_id', render: pname },
                  { title: '数量', dataIndex: 'qty', align: 'right' as const, render: (v: number) => `${v} 箱` },
                  { title: '单价', dataIndex: 'sale_price', align: 'right' as const, render: (v: number) => `¥ ${v.toFixed(2)}` },
                  { title: '金额', align: 'right' as const, render: (_: any, r: any) => <span style={{ fontFamily: 'var(--font-mono)' }}>¥ {(r.qty * r.sale_price).toFixed(0)}</span> },
                  { title: '已收', dataIndex: 'received_amount', align: 'right' as const, render: (v: number) => <span className="text-moss" style={{ fontFamily: 'var(--font-mono)' }}>¥ {v.toFixed(0)}</span> },
                  { title: '状态', dataIndex: 'receive_status', render: (v: string) => <Tag color={RECEIVE_STATUS[v]?.color}>{RECEIVE_STATUS[v]?.label || v}</Tag> },
                ]}
              />
            ),
          },
          {
            key: 'payment', label: `收款记录（${tx.length}）`,
            children: tx.length === 0 ? <Empty /> : (
              <Table
                size="small"
                rowKey="id"
                dataSource={tx}
                pagination={false}
                columns={[
                  { title: '日期', dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleDateString() },
                  { title: '关联销售单', dataIndex: 'ref_order_no', render: (v: string) => <span style={{ fontFamily: 'var(--font-mono)' }}>{v || '—'}</span> },
                  { title: '金额', dataIndex: 'amount', align: 'right' as const, render: (v: number) => <span className="text-moss" style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>+¥ {v.toFixed(0)}</span> },
                  { title: '备注', dataIndex: 'remark', ellipsis: true },
                ]}
              />
            ),
          },
        ]}
      />
    </Card>
  );
}
