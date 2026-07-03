import { Card, Descriptions, Tabs, Tag, Image, Empty, Button, Input, InputNumber, Space, App, Upload, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined, EditOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/store';
import { canEdit as canEditPerm } from '@/utils/permissions';
import { api } from '@/api/client';
import EditModal, { FieldDef } from '@/components/EditModal';

const fields: FieldDef[] = [
  { name: 'category',     label: '品名', required: true },
  { name: 'factory_code', label: '厂号', required: true },
  { name: 'spec',         label: '规格' },
  { name: 'grade',        label: '等级', type: 'select', options: [{ value: 'A级', label: 'A级' }, { value: 'B级', label: 'B级' }, { value: '精品', label: '精品' }] },
  { name: 'origin',       label: '产地' },
  { name: 'goods_location', label: '提货地' },
  { name: 'price',        label: '展示价(元/吨)', type: 'number', min: 0, step: 0.01 },
  { name: 'price_remark', label: '价格备注' },
  { name: 'stock',        label: '库存(吨)', type: 'number', min: 0, step: 0.01 },
  { name: 'tag_ids', label: '标签', type: 'select', options: [] },
  { name: 'remark',       label: '备注', type: 'textarea' },
];

export default function WebsiteProductDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { message } = App.useApp();
  const user = useAuth(s => s.user)!;
  const canEdit = canEditPerm(user.role, 'products');
  const [product, setProduct] = useState<any>(null);
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  // Price tab: parse prices_json
  const [editPrices, setEditPrices] = useState<Array<{ price: number; remark: string }>>([]);
  const [priceDirty, setPriceDirty] = useState(false);

  // Stock tab
  const [editStock, setEditStock] = useState<number>(0);
  const [stockDirty, setStockDirty] = useState(false);

  const reload = () => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.one('website-products', id),
      api.list<any[]>('media').catch(() => []),
    ]).then(([p, allMedia]) => {
      setProduct(p);
      setMedia(allMedia.filter((m: any) => m.product_id === +id!));
      // Parse prices
      let parsed: any[] = [];
      try { parsed = JSON.parse((p as any).prices_json || '[]'); } catch {}
      if (parsed.length === 0 && (p as any).price) {
        parsed = [{ price: (p as any).price, remark: (p as any).price_remark || '' }];
      }
      setEditPrices(parsed.map((x: any) => ({ price: x.price || 0, remark: x.remark || '' })));
      setPriceDirty(false);
      setEditStock((p as any).stock || 0);
      setStockDirty(false);
    }).finally(() => setLoading(false));
  };
  useEffect(reload, [id]);

  const savePrices = async () => {
    const first = editPrices[0] || { price: 0, remark: '' };
    await api.update('website-products', product.id, {
      prices_json: JSON.stringify(editPrices),
      price: first.price,
      price_remark: first.remark,
    });
    message.success('价格已保存');
    reload();
  };

  const saveStock = async () => {
    await api.update('website-products', product.id, { stock: editStock });
    message.success('库存已保存');
    reload();
  };

  const removeMedia = async (mediaId: number) => {
    try { await api.remove('media', mediaId); message.success('已删除'); reload(); } catch (e: any) { message.error(e.message); }
  };

  if (loading) return <Card loading />;
  if (!product) return <Empty description="产品不存在" />;

  return (
    <>
      <Card
        title={
          <span>
            <a onClick={() => nav('/website-products')} style={{ color: 'var(--ink-3)', marginRight: 12 }}>← 官网产品列表</a>
            {product.category} · {product.factory_code}
          </span>
        }
        extra={canEdit && <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>编辑</Button>}
      >
        <Tabs
          items={[
            {
              key: 'info', label: '基本信息',
              children: (
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="品名">{product.category}</Descriptions.Item>
                  <Descriptions.Item label="产地">{product.origin}</Descriptions.Item>
                  <Descriptions.Item label="厂号">{product.factory_code}</Descriptions.Item>
                  <Descriptions.Item label="规格">{product.spec}</Descriptions.Item>
                  <Descriptions.Item label="等级"><Tag color="processing">{product.grade}</Tag></Descriptions.Item>
                  <Descriptions.Item label="提货地">{product.goods_location}</Descriptions.Item>
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
                      <Button size="small" icon={<PlusOutlined />} onClick={() => { setEditPrices([...editPrices, { price: 0, remark: '' }]); setPriceDirty(true); }}>添加价格</Button>
                      {priceDirty && <Button size="small" type="primary" onClick={savePrices}>保存价格</Button>}
                    </div>
                  )}
                  {editPrices.length === 0 ? <Empty description="暂无价格" /> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {editPrices.map((p, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ color: 'var(--ink-3)', fontSize: 12, width: 20, textAlign: 'center' }}>{i + 1}</span>
                          <InputNumber
                            value={p.price}
                            min={0} step={0.01}
                            addonBefore="¥"
                            style={{ width: 160 }}
                            onChange={v => { const n = [...editPrices]; n[i].price = v || 0; setEditPrices(n); setPriceDirty(true); }}
                            disabled={!canEdit}
                          />
                          <Input
                            value={p.remark}
                            placeholder="价格备注（如：1%农副价）"
                            style={{ flex: 1 }}
                            onChange={e => { const n = [...editPrices]; n[i].remark = e.target.value; setEditPrices(n); setPriceDirty(true); }}
                            disabled={!canEdit}
                          />
                          {canEdit && <Button size="small" danger icon={<DeleteOutlined />} onClick={() => { setEditPrices(editPrices.filter((_, j) => j !== i)); setPriceDirty(true); }} />}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ),
            },
            {
              key: 'stock', label: `库存（${(product.stock || 0).toFixed(2)} 吨）`,
              children: (
                <>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                    <InputNumber
                      value={editStock}
                      min={0} step={0.01}
                      addonAfter="吨"
                      style={{ width: 180 }}
                      onChange={v => { setEditStock(v || 0); setStockDirty(true); }}
                      disabled={!canEdit}
                    />
                    {canEdit && stockDirty && <Button size="small" type="primary" onClick={saveStock}>保存库存</Button>}
                  </div>
                </>
              ),
            },
            {
              key: 'media', label: '图片资料',
              children: (
                <>
                  {canEdit && (
                    <div style={{ marginBottom: 12 }}>
                      <Upload
                        showUploadList={false}
                        beforeUpload={async (file: File) => {
                          try {
                            await api.uploadFile(file, { product_id: +id!, type: 'image', uploader_id: user.id });
                            message.success('上传成功');
                            reload();
                          } catch (e: any) { message.error(e.message || '上传失败'); }
                          return false;
                        }}
                      >
                        <Button type="primary" icon={<UploadOutlined />}>上传图片</Button>
                      </Upload>
                    </div>
                  )}
                  {media.length === 0 ? <Empty description="暂无图片" /> : (
                    <Image.PreviewGroup>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                        {media.map(m => (
                          <div key={m.id} style={{ border: '1px solid var(--line)', background: 'var(--paper-2)', padding: 8, position: 'relative' }}>
                            <Image src={m.file_path} alt="产品图" style={{ width: '100%', height: 140, objectFit: 'cover' }} />
                            {m.remark && <div style={{ fontSize: 12, marginTop: 4 }}>{m.remark}</div>}
                            <div className="text-ink-3" style={{ fontSize: 11, marginTop: 4 }}>{new Date(m.created_at).toLocaleString()}</div>
                            <div style={{ position: 'absolute', top: 4, right: 4 }}>
                              <Popconfirm title="删除该图片？" onConfirm={() => removeMedia(m.id)}>
                                <Button size="small" danger icon={<DeleteOutlined />} />
                              </Popconfirm>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Image.PreviewGroup>
                  )}
                </>
              ),
            },
          ]}
        />
      </Card>

      <EditModal
        open={editOpen}
        title="编辑官网产品"
        fields={fields}
        initial={product}
        onCancel={() => setEditOpen(false)}
        onSubmit={async (v) => {
          await api.update('website-products', product.id, v);
          setEditOpen(false);
          reload();
        }}
      />
    </>
  );
}
