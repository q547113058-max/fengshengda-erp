import { Card, Table, Tag, Space, Progress, Avatar } from 'antd';
import { useEffect, useState } from 'react';
import { api } from '@/api/client';

export default function Salesman() {
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.users(), api.salesOrders()])
      .then(([u, so]) => { setUsers(u.filter(x => x.role === 'sales')); setOrders(so); })
      .finally(() => setLoading(false));
  }, []);

  const data = users.map(u => {
    const my = orders.filter(o => o.sales_user_id === u.id);
    const total = my.reduce((a, b) => a + b.qty * b.sale_price, 0);
    const commission = my.reduce((a, b) => a + b.commission_amt, 0);
    const received = my.reduce((a, b) => a + b.received_amount, 0);
    return { user: u, orderCount: my.length, total, commission, received, unpaid: total - received };
  });

  const totalAll = data.reduce((a, b) => a + b.total, 0) || 1;
  const totalCommission = data.reduce((a, b) => a + b.commission, 0);

  return (
    <Card
      title="业务员业绩"
      extra={
        <span className="text-ink-3" style={{ fontSize: 12, letterSpacing: '0.1em' }}>
          总销售 ¥ {totalAll.toLocaleString()} · 总佣金 ¥ {totalCommission.toFixed(0)}
        </span>
      }
    >
      <Table
        size="small"
        loading={loading}
        rowKey={(r: any) => r.user.id}
        dataSource={data}
        pagination={false}
        columns={[
          {
            title: '业务员', key: 'name', width: 200,
            render: (_: any, r: any) => (
              <Space>
                <Avatar size={32} style={{ background: 'var(--ink)' }}>{r.user.full_name[0]}</Avatar>
                <div>
                  <div style={{ fontWeight: 500 }}>{r.user.full_name}</div>
                  <div className="text-ink-3" style={{ fontSize: 11 }}>默认佣金 {r.user.default_commission_rate}%</div>
                </div>
              </Space>
            ),
          },
          { title: '订单数', dataIndex: 'orderCount', width: 90, align: 'right' as const, render: (v: number) => <Tag color="processing">{v}</Tag> },
          { title: '销售总额', dataIndex: 'total', width: 140, align: 'right' as const, render: (v: number) => <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>¥ {v.toLocaleString()}</span> },
          {
            title: '销售占比', width: 200,
            render: (_: any, r: any) => <Progress percent={Math.round((r.total / totalAll) * 100)} size="small" />,
          },
          { title: '已收款', dataIndex: 'received', width: 120, align: 'right' as const, render: (v: number) => <span className="text-moss" style={{ fontFamily: 'var(--font-mono)' }}>¥ {v.toLocaleString()}</span> },
          { title: '未收款', dataIndex: 'unpaid', width: 120, align: 'right' as const, render: (v: number) => v > 0 ? <span className="text-burgundy" style={{ fontFamily: 'var(--font-mono)' }}>¥ {v.toLocaleString()}</span> : <span className="text-moss">—</span> },
          { title: '佣金', dataIndex: 'commission', width: 130, align: 'right' as const, render: (v: number) => <span className="text-copper" style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>¥ {v.toFixed(2)}</span> },
        ]}
      />
    </Card>
  );
}
