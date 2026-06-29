import { Card, Table, Progress, Space, Tag } from 'antd';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Inventory() {
  const nav = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.inventoryAgg(), api.inventoryBatches()])
      .then(([r, b]) => { setRows(r); setBatches(b); })
      .finally(() => setLoading(false));
  }, []);

  // 库存水位图数据
  const stockChart = useMemo(() => {
    return rows
      .map(r => ({
        name: `${r.product.category} · ${r.product.factory_code}`,
        remaining: r.qtyRem,
        sold: r.sold,
      }))
      .sort((a, b) => b.remaining - a.remaining);
  }, [rows]);

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      {/* 库存水位图 */}
      {stockChart.length > 0 && (
        <Card title="库存水位（吨）" extra={<span className="text-ink-3" style={{ fontSize: 12 }}>剩余 / 已售</span>}>
          <ResponsiveContainer width="100%" height={Math.max(200, stockChart.length * 36)}>
            <BarChart data={stockChart} layout="vertical" margin={{ left: 140 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={135} />
              <Tooltip />
              <Bar dataKey="remaining" name="剩余" fill="#2c5282" radius={[0, 4, 4, 0]} stackId="a" />
              <Bar dataKey="sold" name="已售" fill="#e0e0e0" radius={[0, 4, 4, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card title="冷链仓总览" extra={<span className="text-ink-3" style={{ fontSize: 12 }}>按产品聚合 · 共 {batches.length} 批次</span>}>
        <Table
          size="small"
          loading={loading}
          rowKey={(r: any) => r.product.id}
          dataSource={rows}
          pagination={false}
          onRow={(r: any) => ({ onClick: () => nav(`/products/${r.product.id}`), style: { cursor: 'pointer' } })}
          columns={[
            {
              title: '产品', width: 280, key: 'name',
              render: (_: any, r: any) => (
                <div>
                  <div style={{ fontWeight: 500 }}>{r.product.category} · {r.product.factory_code}</div>
                  <div className="text-ink-3" style={{ fontSize: 11 }}>{r.product.spec}</div>
                </div>
              ),
            },
            { title: '货地', dataIndex: ['product', 'goods_location'], width: 130, render: (s: string) => <span className="text-ink-3">{s}</span> },
            { title: '批次数', dataIndex: 'batchCount', width: 80, align: 'right' as const, render: (v: number) => <Tag color="processing">{v}</Tag> },
            { title: '入库总数', dataIndex: 'qtyTotal', width: 100, align: 'right' as const, render: (v: number) => <span style={{ fontFamily: 'var(--font-mono)' }}>{v}</span> },
            { title: '已售', dataIndex: 'sold', width: 90, align: 'right' as const, render: (v: number) => <span className="text-ink-3" style={{ fontFamily: 'var(--font-mono)' }}>{v}</span> },
            {
              title: '剩余', dataIndex: 'qtyRem', width: 110, align: 'right' as const,
              render: (v: number) => <span className="text-copper" style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600 }}>{v}</span>,
            },
            {
              title: '库存率', width: 200,
              render: (_: any, r: any) => {
                const pct = r.qtyTotal > 0 ? Math.round((r.qtyRem / r.qtyTotal) * 100) : 0;
                return <Progress percent={pct} size="small" strokeColor={pct < 30 ? 'var(--burgundy)' : 'var(--moss)'} />;
              },
            },
          ]}
        />
      </Card>

      <Card title="批次明细">
        <Table
          size="small"
          loading={loading}
          rowKey="id"
          dataSource={batches}
          pagination={{ pageSize: 10 }}
          onRow={(r: any) => ({ onClick: () => nav(`/inventory/batch/${r.id}`), style: { cursor: 'pointer' } })}
          columns={[
            { title: '批次号', dataIndex: 'batch_no', render: (v: string) => <span style={{ fontFamily: 'var(--font-mono)' }}>{v}</span> },
            { title: '产品', dataIndex: 'product_id', render: (id: number) => {
              const r = rows.find(x => x.product.id === id);
              return r ? `${r.product.category} · ${r.product.factory_code}` : `#${id}`;
            }},
            { title: '仓库位置', dataIndex: 'warehouse' },
            { title: '接手人', dataIndex: 'holder' },
            { title: '总数', dataIndex: 'qty_total', align: 'right' as const },
            { title: '剩余', dataIndex: 'qty_remaining', align: 'right' as const, render: (v: number) => <span className="text-copper" style={{ fontWeight: 500 }}>{v}</span> },
            { title: '状态', dataIndex: 'status', width: 100, render: (v: string) => {
              const cfg: any = { in_stock: { c: 'success', t: '在库' }, sold_out: { c: 'default', t: '已售罄' }, transferred: { c: 'warning', t: '调拨中' } };
              return <Tag color={cfg[v]?.c || 'default'}>{cfg[v]?.t || v}</Tag>;
            }},
            { title: '入库时间', dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleString() },
          ]}
        />
      </Card>
    </Space>
  );
}
