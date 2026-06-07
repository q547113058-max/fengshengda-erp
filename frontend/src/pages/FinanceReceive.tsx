import { Card, Table, Tag, Space, Button } from 'antd';
import { useEffect, useState } from 'react';
import { api } from '@/api/client';

const SOURCE_LABEL: Record<string, { c: string; t: string }> = {
  sale:       { c: 'green',  t: '销售收款' },
  commission: { c: 'gold',   t: '佣金支出' },
  purchase:   { c: 'volcano',t: '采购付款' },
  manual:     { c: 'blue',   t: '手工记账' },
};

export default function FinanceReceive() {
  const [list, setList] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.transactions('in'), api.accounts(), api.users()])
      .then(([t, a, u]) => { setList(t); setAccounts(a); setUsers(u); })
      .finally(() => setLoading(false));
  }, []);

  const aname = (id: number) => accounts.find(x => x.id === id)?.name || `#${id}`;
  const uname = (id: number) => users.find(x => x.id === id)?.full_name || `#${id}`;

  const total = list.reduce((a, b) => a + b.amount, 0);
  const saleIn = list.filter(x => x.source_type === 'sale').reduce((a, b) => a + b.amount, 0);

  return (
    <Card
      title="财务收款"
      extra={
        <Space>
          <span className="text-ink-3" style={{ fontSize: 12 }}>本月收款 ¥ {total.toLocaleString()}（其中销售 ¥ {saleIn.toLocaleString()}）</span>
          <Button type="primary">+ 登记收款</Button>
        </Space>
      }
    >
      <Table
        size="small"
        loading={loading}
        rowKey="id"
        dataSource={list}
        pagination={{ pageSize: 20 }}
        columns={[
          { title: '日期', dataIndex: 'created_at', width: 160, render: (v: string) => new Date(v).toLocaleString() },
          { title: '类型', dataIndex: 'source_type', width: 110, render: (v: string) => <Tag color={SOURCE_LABEL[v]?.c}>{SOURCE_LABEL[v]?.t || v}</Tag> },
          { title: '收款账户', dataIndex: 'account_id', width: 160, render: aname },
          { title: '对方', dataIndex: 'counter_party', width: 180 },
          { title: '金额', dataIndex: 'amount', width: 130, align: 'right' as const, render: (v: number) => <span className="text-moss" style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600 }}>+¥ {v.toLocaleString()}</span> },
          { title: '关联单', dataIndex: 'ref_order_no', width: 150, render: (s: string) => s ? <span style={{ fontFamily: 'var(--font-mono)' }}>{s}</span> : '—' },
          { title: '经办人', dataIndex: 'operator_id', width: 100, render: uname },
          { title: '备注', dataIndex: 'remark', ellipsis: true },
        ]}
      />
    </Card>
  );
}
