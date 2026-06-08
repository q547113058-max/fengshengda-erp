import { Card, Descriptions, Timeline, Table, Tag, Empty, Steps } from 'antd';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/api/client';

const TYPE_LABEL: Record<string, { c: string; t: string }> = {
  in: { c: 'green', t: '入库' },
  out: { c: 'red', t: '出库' },
  transfer: { c: 'gold', t: '调拨' },
  loss: { c: 'volcano', t: '损耗' },
  return: { c: 'blue', t: '退货' },
};

export default function BatchDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [batch, setBatch] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.one('inventory/batch', id),
      api.list<any[]>('movements'),
      api.list<any[]>('products'),
    ]).then(([b, mv, ps]: any) => {
      setBatch(b);
      setMovements(mv.filter((m: any) => m.batch_id === b.id).sort((a: any, c: any) => a.id - c.id));
      setProduct(ps.find((p: any) => p.id === b.product_id));
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Card loading />;
  if (!batch) return <Empty description="批次不存在" />;

  return (
    <Card
      title={
        <span>
          <a onClick={() => nav('/inventory')} style={{ color: 'var(--ink-3)', marginRight: 12 }}>← 库存</a>
          批次详情 · {batch.batch_no}
        </span>
      }
    >
      <Descriptions column={3} bordered size="small">
        <Descriptions.Item label="批次号">{batch.batch_no}</Descriptions.Item>
        <Descriptions.Item label="入库时间">{new Date(batch.created_at).toLocaleString()}</Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag color={batch.status === 'in_stock' ? 'success' : 'default'}>
            {batch.status === 'in_stock' ? '在库' : batch.status === 'sold_out' ? '已售罄' : '调拨中'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="产品" span={2}>{product ? `${product.category} · ${product.factory_code} · ${product.spec}` : `#${batch.product_id}`}</Descriptions.Item>
        <Descriptions.Item label="产地">{product?.origin || '—'}</Descriptions.Item>
        <Descriptions.Item label="仓库位置">{batch.warehouse}</Descriptions.Item>
        <Descriptions.Item label="接手人">{batch.holder}</Descriptions.Item>
        <Descriptions.Item label="入库总数">{batch.qty_total} 吨</Descriptions.Item>
        <Descriptions.Item label="已售出">{batch.qty_total - batch.qty_remaining} 吨</Descriptions.Item>
        <Descriptions.Item label="当前剩余"><span className="text-copper" style={{ fontWeight: 600, fontSize: 16 }}>{batch.qty_remaining} 吨</span></Descriptions.Item>
        <Descriptions.Item label="库存率" span={3}>
          {((batch.qty_remaining / batch.qty_total) * 100).toFixed(0)}%
        </Descriptions.Item>
      </Descriptions>

      <div style={{ marginTop: 32 }}>
        <div className="section-head">
          <div className="title">流转时间线</div>
          <div className="eyebrow">FLOW</div>
        </div>
        {movements.length === 0 ? <Empty description="暂无流转记录" /> : (
          <Timeline
            items={movements.map(m => {
              const t = TYPE_LABEL[m.type] || { c: 'default', t: m.type };
              return {
                color: t.c,
                children: (
                  <div>
                    <div style={{ fontWeight: 500 }}>
                      <Tag color={t.c}>{t.t}</Tag>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{m.type === 'in' ? `+${m.qty}` : `-${m.qty}`} 吨</span>
                      <span className="text-ink-3" style={{ marginLeft: 12, fontSize: 12 }}>{new Date(m.created_at).toLocaleString()}</span>
                    </div>
                    <div className="text-ink-3" style={{ fontSize: 12, marginTop: 4 }}>
                      {m.operator && <span>操作人：{m.operator}</span>}
                      {m.to_holder && <span style={{ marginLeft: 12 }}>去向：{m.to_holder}</span>}
                      {m.ref_order_no && <span style={{ marginLeft: 12 }}>关联单：{m.ref_order_no}</span>}
                    </div>
                    {m.remark && <div style={{ marginTop: 4, fontSize: 13 }}>{m.remark}</div>}
                  </div>
                ),
              };
            })}
          />
        )}
      </div>

      <div style={{ marginTop: 32 }}>
        <div className="section-head">
          <div className="title">流水明细</div>
          <div className="eyebrow">DETAIL</div>
        </div>
        <Table
          size="small"
          rowKey="id"
          dataSource={movements}
          pagination={false}
          columns={[
            { title: '时间', dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleString() },
            { title: '类型', dataIndex: 'type', render: (v: string) => <Tag color={TYPE_LABEL[v]?.c}>{TYPE_LABEL[v]?.t || v}</Tag> },
            { title: '数量', dataIndex: 'qty', align: 'right' as const, render: (v: number, r: any) => <span style={{ fontFamily: 'var(--font-mono)' }}>{r.type === 'in' ? `+${v}` : `-${v}`}</span> },
            { title: '操作人', dataIndex: 'operator' },
            { title: '去向', dataIndex: 'to_holder', render: (s: string) => s || '—' },
            { title: '关联单', dataIndex: 'ref_order_no', render: (s: string) => s || '—' },
            { title: '备注', dataIndex: 'remark', ellipsis: true },
          ]}
        />
      </div>
    </Card>
  );
}
