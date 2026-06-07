import { Card, Descriptions, Table, Tabs, Tag, Image, Empty } from 'antd';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/api/client';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [prices, setPrices] = useState<any[]>([]);
  const [media, setMedia] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.one('products', id),
      api.one('products', id).then(() => api.list<any[]>('media').catch(() => [])).then(all => all.filter((m: any) => m.product_id === +id!)),
      api.list<any[]>('inventory/batches').then(all => all.filter((b: any) => b.product_id === +id!)),
    ]).then(([p, m, b]: any) => {
      setProduct(p);
      setPrices(p?.prices || []);
      setMedia(m);
      setBatches(b);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Card loading />;
  if (!product) return <Empty description="产品不存在" />;

  const totalStock = batches.reduce((a, b) => a + b.qty_remaining, 0);
  const totalSold = batches.reduce((a, b) => a + (b.qty_total - b.qty_remaining), 0);

  return (
    <Card
      title={
        <span>
          <a onClick={() => nav('/products')} style={{ color: 'var(--ink-3)', marginRight: 12 }}>← 产品列表</a>
          {product.category} · {product.factory_code}
        </span>
      }
    >
      <Tabs
        items={[
          {
            key: 'info', label: '基本信息',
            children: (
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="品类">{product.category}</Descriptions.Item>
                <Descriptions.Item label="产地">{product.origin}</Descriptions.Item>
                <Descriptions.Item label="厂号">{product.factory_code}</Descriptions.Item>
                <Descriptions.Item label="规格">{product.spec}</Descriptions.Item>
                <Descriptions.Item label="等级"><Tag color="processing">{product.grade}</Tag></Descriptions.Item>
                <Descriptions.Item label="货地">{product.goods_location}</Descriptions.Item>
                <Descriptions.Item label="每箱数量">{product.qty_per_unit} 袋/盒</Descriptions.Item>
                <Descriptions.Item label="备注" span={2}>{product.remark || '—'}</Descriptions.Item>
              </Descriptions>
            ),
          },
          {
            key: 'price', label: '双税票价',
            children: (
              <Table
                size="small"
                rowKey="id"
                dataSource={prices}
                pagination={false}
                columns={[
                  { title: '税率', dataIndex: 'tax_rate', render: (v: number) => <Tag color={v === 1 ? 'gold' : 'blue'}>{v === 1 ? '1% 农副' : '9% 一般'}</Tag> },
                  { title: '含税价', dataIndex: 'price', align: 'right' as const, render: (v: number) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 500 }}>¥ {v.toFixed(2)} / 箱</span> },
                  { title: '生效日期', dataIndex: 'effective_from' },
                ]}
              />
            ),
          },
          {
            key: 'stock', label: `库存（${batches.length} 批次 / 剩余 ${totalStock} 箱）`,
            children: (
              <Table
                size="small"
                rowKey="id"
                dataSource={batches}
                pagination={false}
                columns={[
                  { title: '批次号', dataIndex: 'batch_no' },
                  { title: '入库日期', dataIndex: 'created_at', render: (v: string) => v?.slice(0, 10) },
                  { title: '仓库位置', dataIndex: 'warehouse' },
                  { title: '接手人', dataIndex: 'holder' },
                  { title: '总数', dataIndex: 'qty_total', align: 'right' as const },
                  { title: '剩余', dataIndex: 'qty_remaining', align: 'right' as const, render: (v: number) => <span className="text-copper" style={{ fontWeight: 500 }}>{v}</span> },
                  { title: '已售', align: 'right' as const, render: (_: any, r: any) => r.qty_total - r.qty_remaining },
                ]}
              />
            ),
          },
          {
            key: 'media', label: '图片资料',
            children: media.length === 0 ? <Empty description="暂无图片" /> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {media.map(m => (
                  <div key={m.id} style={{ border: '1px solid var(--line)', background: 'var(--paper-2)', padding: 8 }}>
                    <Image src={m.file_path} alt="产品图" style={{ width: '100%', height: 140, objectFit: 'cover' }} />
                    <div className="text-ink-3" style={{ fontSize: 11, marginTop: 6 }}>{new Date(m.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            ),
          },
        ]}
      />
    </Card>
  );
}
