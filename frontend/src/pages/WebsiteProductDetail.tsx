import { Card, Descriptions, Tag, Image, Empty, Button, Upload, Popconfirm, App, Tabs } from 'antd';
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/store';
import { canEdit as canEditPerm } from '@/utils/permissions';
import { api } from '@/api/client';

export default function WebsiteProductDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { message } = App.useApp();
  const user = useAuth(s => s.user)!;
  const canEdit = canEditPerm(user.role, 'products');
  const [product, setProduct] = useState<any>(null);
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = () => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.one('website-products', id),
      api.list<any[]>('media').catch(() => []),
    ]).then(([p, allMedia]) => {
      setProduct(p);
      setMedia(allMedia.filter((m: any) => m.product_id === +id!));
    }).finally(() => setLoading(false));
  };
  useEffect(reload, [id]);

  const removeMedia = async (mediaId: number) => {
    try { await api.remove('media', mediaId); message.success('已删除'); reload(); } catch (e: any) { message.error(e.message); }
  };

  if (loading) return <Card loading />;
  if (!product) return <Empty description="产品不存在" />;

  return (
    <Card
      title={
        <span>
          <a onClick={() => nav('/website-products')} style={{ color: 'var(--ink-3)', marginRight: 12 }}>← 官网产品列表</a>
          {product.category} · {product.factory_code}
        </span>
      }
    >
      <Descriptions column={2} bordered size="small" style={{ marginBottom: 20 }}>
        <Descriptions.Item label="品名">{product.category}</Descriptions.Item>
        <Descriptions.Item label="厂号">{product.factory_code}</Descriptions.Item>
        <Descriptions.Item label="规格">{product.spec || '—'}</Descriptions.Item>
        <Descriptions.Item label="产地">{product.origin || '—'}</Descriptions.Item>
        <Descriptions.Item label="等级">{product.grade ? <Tag color="processing">{product.grade}</Tag> : '—'}</Descriptions.Item>
        <Descriptions.Item label="提货地">{product.goods_location || '—'}</Descriptions.Item>
        <Descriptions.Item label="展示价">{product.price ? <span style={{ color: '#dc2626', fontWeight: 600 }}>¥ {product.price.toFixed(2)}</span> : '—'}</Descriptions.Item>
        <Descriptions.Item label="价格备注">{product.price_remark || '—'}</Descriptions.Item>
        <Descriptions.Item label="备注" span={2}>{product.remark || '—'}</Descriptions.Item>
      </Descriptions>

      <Tabs
        items={[{
          key: 'media',
          label: '图片资料',
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
              )}
            </>
          ),
        }]}
      />
    </Card>
  );
}
