import { Card, Descriptions, Table, Tabs, Tag, Image, Empty, Button, Input, InputNumber, Space, App } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/store';
import { canEdit as canEditPerm } from '@/utils/permissions';
import { api } from '@/api/client';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { message } = App.useApp();
  const user = useAuth(s => s.user)!;
  const canEdit = canEditPerm(user.role, 'products');
  const [product, setProduct] = useState<any>(null);
  const [prices, setPrices] = useState<any[]>([]);
  const [editPrices, setEditPrices] = useState<any[]>([]);
  const [priceDirty, setPriceDirty] = useState(false);
  const [media, setMedia] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = () => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.one('products', id),
      api.list<any[]>('media').catch(() => []),
      api.list<any[]>('inventory/batches').catch(() => []),
    ]).then(([p, allMedia, allBatches]: any) => {
      setProduct(p);
      const pr = p?.prices || [];
      setPrices(pr);
      setEditPrices(pr.map((x: any) => ({ ...x })));
      setPriceDirty(false);
      setMedia(allMedia.filter((m: any) => m.product_id === +id!));
      setBatches(allBatches.filter((b: any) => b.product_id === +id!));
    }).finally(() => setLoading(false));
  };
  useEffect(reload, [id]);

  if (loading) return <Card loading />;
  if (!product) return <Empty description="产品不存在" />;

  const totalStock = batches.reduce((a, b) => a + b.qty_remaining, 0);

  const addPrice = () => { setEditPrices([...editPrices, { price: 0, remark: '' }]); setPriceDirty(true); };
  const removePrice = (idx: number) => { setEditPrices(editPrices.filter((_, i) => i !== idx)); setPriceDirty(true); };
  const updatePrice = (idx: number, field: string, val: any) => {
    const next = [...editPrices];
    next[idx] = { ...next[idx], [field]: val };
    setEditPrices(next);
    setPriceDirty(true);
  };
  const savePrices = async () => {
    const cleaned = editPrices.filter(p => p.price > 0).map(p => ({ price: p.price, remark: p.remark || '' }));
    await api.update('products', product.id, { prices: cleaned });
    message.success('价格已保存');
    reload();
  };

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
                <Descriptions.Item label="库存(吨)">{product.qty_per_unit} 吨</Descriptions.Item>
                <Descriptions.Item label="备注" span={2}>{product.remark || '—'}</Descriptions.Item>
              </Descriptions>
            ),
          },
          {
            key: 'price', label: '价格',
            children: (
              <>
                {canEdit && (
                  <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
                    <Button size="small" icon={<PlusOutlined />} onClick={addPrice}>添加价格</Button>
                    {priceDirty && <Button size="small" type="primary" onClick={savePrices}>保存价格</Button>}
                  </div>
                )}
                {editPrices.length === 0 ? (
                  <Empty description="暂无价格" />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {editPrices.map((p, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ color: 'var(--ink-3)', fontSize: 12, width: 20, textAlign: 'center' }}>{i + 1}</span>
                        <InputNumber
                          value={p.price}
                          min={0}
                          step={0.01}
                          placeholder="单价(元/吨)"
                          style={{ width: 160 }}
                          onChange={v => updatePrice(i, 'price', v || 0)}
                          addonBefore="¥"
                          disabled={!canEdit}
                        />
                        <Input
                          value={p.remark}
                          placeholder="备注（如：1%农副价、散客价）"
                          style={{ flex: 1 }}
                          onChange={e => updatePrice(i, 'remark', e.target.value)}
                          disabled={!canEdit}
                        />
                        {canEdit && <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removePrice(i)} />}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ),
          },
          {
            key: 'stock', label: `库存（${batches.length} 批次 / 剩余 ${totalStock} 吨）`,
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
                    {m.remark && <div style={{ fontSize: 12, marginTop: 4 }}>{m.remark}</div>}
                    <div className="text-ink-3" style={{ fontSize: 11, marginTop: 4 }}>{new Date(m.created_at).toLocaleString()}</div>
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
