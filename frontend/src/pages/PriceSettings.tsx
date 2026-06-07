import { Card, Table, Tag, Space, Button } from 'antd';
import { useEffect, useState } from 'react';
import { api } from '@/api/client';

export default function PriceSettings() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.products().then(setList).finally(() => setLoading(false));
  }, []);

  return (
    <Card
      title="双税票价设置"
      extra={<Button type="primary">+ 新增价格</Button>}
    >
      <div className="text-ink-3" style={{ fontSize: 12, marginBottom: 16, letterSpacing: '0.06em' }}>
        1% 农副 · 9% 一般纳税人 — 同一产品维护两套含税价
      </div>
      <Table
        size="small"
        loading={loading}
        rowKey={(r: any) => `${r.id}-${Math.random()}`}
        dataSource={list.flatMap(p => (p.prices || []).map((pr: any) => ({ ...pr, product: p })))}
        pagination={false}
        columns={[
          {
            title: '产品', key: 'name', width: 280,
            render: (_: any, r: any) => (
              <div>
                <div style={{ fontWeight: 500 }}>{r.product.category} · {r.product.factory_code}</div>
                <div className="text-ink-3" style={{ fontSize: 11 }}>{r.product.spec}</div>
              </div>
            ),
          },
          { title: '产地', dataIndex: ['product', 'origin'], width: 110 },
          { title: '税率', dataIndex: 'tax_rate', width: 90, render: (v: number) => <Tag color={v === 1 ? 'gold' : 'blue'}>{v === 1 ? '1% 农副' : '9% 一般'}</Tag> },
          { title: '含税单价', dataIndex: 'price', width: 130, align: 'right' as const, render: (v: number) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 500 }}>¥ {v.toFixed(2)}</span> },
          { title: '生效日期', dataIndex: 'effective_from', width: 130 },
          { title: '操作', width: 110, align: 'right' as const, render: () => <Button size="small">编辑</Button> },
        ]}
      />
    </Card>
  );
}
