import { Card, Table, Tag, Space, Button, Tabs } from 'antd';
import { useEffect, useState } from 'react';
import { api } from '@/api/client';

const ROLE_LABEL: Record<string, string> = { boss: '老板', finance: '财务', warehouse: '仓储', sales: '销售' };
const ROLE_COLOR: Record<string, string> = { boss: 'gold', finance: 'blue', warehouse: 'green', sales: 'default' };

const MODULES = [
  { key: 'products',  label: '产品' },
  { key: 'purchase',  label: '采购' },
  { key: 'suppliers', label: '供应商' },
  { key: 'inventory', label: '库存' },
  { key: 'sales',     label: '销售' },
  { key: 'customers', label: '客户' },
  { key: 'finance',   label: '财务' },
];

const MATRIX: Record<string, string[]> = {
  boss:      ['products','purchase','suppliers','inventory','sales','customers','finance'],
  finance:   ['products','purchase','suppliers','sales','customers','finance'],
  warehouse: ['products','purchase','suppliers','inventory'],
  sales:     ['products','sales','customers'],
};

export default function UserSettings() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.users().then(setUsers).finally(() => setLoading(false));
  }, []);

  return (
    <Card title="用户与权限">
      <Tabs
        items={[
          {
            key: 'list', label: '用户列表',
            children: (
              <Table
                size="small"
                loading={loading}
                rowKey="id"
                dataSource={users}
                pagination={false}
                columns={[
                  { title: '工号', dataIndex: 'username', render: (v: string) => <span style={{ fontFamily: 'var(--font-mono)' }}>{v}</span> },
                  { title: '姓名', dataIndex: 'full_name', render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span> },
                  { title: '角色', dataIndex: 'role', width: 100, render: (v: string) => <Tag color={ROLE_COLOR[v]}>{ROLE_LABEL[v]}</Tag> },
                  { title: '电话', dataIndex: 'phone', width: 140, render: (s: string) => <span style={{ fontFamily: 'var(--font-mono)' }}>{s || '—'}</span> },
                  { title: '默认佣金', dataIndex: 'default_commission_rate', width: 100, align: 'right' as const, render: (v: number) => v ? `${v}%` : '—' },
                  { title: '状态', dataIndex: 'status', width: 90, render: (v: string) => <Tag color={v === 'active' ? 'success' : 'default'}>{v === 'active' ? '正常' : v}</Tag> },
                  { title: '操作', width: 110, align: 'right' as const, render: () => <Button size="small">编辑</Button> },
                ]}
              />
            ),
          },
          {
            key: 'matrix', label: '权限矩阵',
            children: (
              <Table
                size="small"
                rowKey="role"
                dataSource={Object.keys(MATRIX).map(role => ({ role, mods: MATRIX[role] }))}
                pagination={false}
                columns={[
                  { title: '角色', dataIndex: 'role', width: 120, render: (v: string) => <Tag color={ROLE_COLOR[v]}>{ROLE_LABEL[v]}</Tag> },
                  ...MODULES.map(m => ({
                    title: m.label, key: m.key, align: 'center' as const, width: 90,
                    render: (_: any, r: any) => r.mods.includes(m.key) ? <span style={{ color: 'var(--moss)', fontSize: 18 }}>✓</span> : <span className="text-ink-3">—</span>,
                  })),
                ]}
              />
            ),
          },
        ]}
      />
    </Card>
  );
}
