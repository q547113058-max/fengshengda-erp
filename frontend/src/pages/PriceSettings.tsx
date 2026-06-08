import { Card, Table, Tag, Button, App } from 'antd';
import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import EditModal, { FieldDef } from '@/components/EditModal';

export default function PriceSettings() {
  const { message } = App.useApp();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null); // null = 新增, object = 编辑价格行

  const reload = () => {
    setLoading(true);
    api.products().then(setProducts).finally(() => setLoading(false));
  };
  useEffect(reload, []);

  // 展开成价格行
  const rows = products.flatMap(p => (p.prices || []).map((pr: any) => ({ ...pr, product: p })));

  const fields: FieldDef[] = editing?.id
    ? [
        { name: 'tax_rate', label: '税率', type: 'select', required: true, options: [{ value: 1, label: '1% 农副' }, { value: 9, label: '9% 一般' }] },
        { name: 'price', label: '含税单价', type: 'number', required: true, min: 0, step: 0.01 },
        { name: 'effective_from', label: '生效日期', type: 'date' },
      ]
    : [
        { name: 'product_id', label: '产品', type: 'select', required: true, options: products.map(p => ({ value: p.id, label: `${p.category} · ${p.factory_code}` })) },
        { name: 'tax_rate', label: '税率', type: 'select', required: true, options: [{ value: 1, label: '1% 农副' }, { value: 9, label: '9% 一般' }] },
        { name: 'price', label: '含税单价', type: 'number', required: true, min: 0, step: 0.01 },
        { name: 'effective_from', label: '生效日期', type: 'date' },
      ];

  return (
    <Card
      title="双税票价设置"
      extra={<Button type="primary" onClick={() => { setEditing(null); setModalOpen(true); }}>+ 新增价格</Button>}
    >
      <div className="text-ink-3" style={{ fontSize: 12, marginBottom: 16, letterSpacing: '0.06em' }}>
        1% 农副 · 9% 一般纳税人 — 同一产品维护两套含税价
      </div>
      <Table
        size="small"
        loading={loading}
        rowKey={(r: any) => `${r.product?.id}-${r.tax_rate}`}
        dataSource={rows}
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
          {
            title: '操作', width: 110, align: 'right' as const,
            render: (_: any, r: any) => (
              <Button size="small" onClick={() => { setEditing(r); setModalOpen(true); }}>编辑</Button>
            ),
          },
        ]}
      />
      <EditModal
        open={modalOpen}
        title={editing?.id ? `编辑价格 · ${editing.product?.category || ''}` : '新增价格'}
        fields={fields}
        initial={editing || {}}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        onSubmit={async (v) => {
          if (editing?.id) {
            // 编辑已有价格 — 通过产品接口更新 prices
            const product = products.find(p => p.id === editing.product_id);
            if (product) {
              const updatedPrices = (product.prices || []).map((pr: any) =>
                pr.id === editing.id ? { ...pr, ...v } : pr
              );
              await api.update('products', product.id, { prices: updatedPrices });
            }
          } else {
            // 新增价格
            const product = products.find(p => p.id === v.product_id);
            if (product) {
              const newPrices = [...(product.prices || []), { tax_rate: v.tax_rate, price: v.price, effective_from: v.effective_from }];
              await api.update('products', v.product_id, { prices: newPrices });
            }
          }
          message.success('已保存');
          reload();
        }}
      />
    </Card>
  );
}
