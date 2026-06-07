import { Card, Image, Empty, Button, Space, Select, App, Upload, Popconfirm } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { useAuth } from '@/store';

export default function Media() {
  const { message } = App.useApp();
  const user = useAuth(s => s.user)!;
  const [media, setMedia] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [filter, setFilter] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const reload = () => {
    setLoading(true);
    Promise.all([api.media(filter), api.products()])
      .then(([m, p]) => { setMedia(m); setProducts(p); })
      .finally(() => setLoading(false));
  };
  useEffect(reload, [filter]);

  const productName = (id: number) => {
    const p = products.find(x => x.id === id);
    return p ? `${p.category} · ${p.factory_code}` : `产品#${id}`;
  };

  const remove = async (id: number) => {
    try { await api.remove('media', id); message.success('已删除'); reload(); } catch (e: any) { message.error(e.message); }
  };

  const uploadProps = {
    showUploadList: false,
    beforeUpload: async (file: File) => {
      try {
        const type = file.type.startsWith('video/') ? 'video' : 'image';
        await api.uploadFile(file, filter, type as any, user.id);
        message.success('上传成功');
        reload();
      } catch (e: any) {
        message.error(e.message || '上传失败');
      }
      return false; // 阻止 antd 默认上传
    },
  };

  return (
    <Card
      title="图片视频资料"
      extra={
        <Space>
          <Select
            placeholder="全部产品"
            value={filter}
            onChange={v => setFilter(v)}
            allowClear
            style={{ width: 220 }}
            options={products.map(p => ({ value: p.id, label: `${p.category} · ${p.factory_code}` }))}
          />
          <Upload {...uploadProps}>
            <Button type="primary" icon={<UploadOutlined />}>上传文件</Button>
          </Upload>
        </Space>
      }
    >
      {media.length === 0 ? (
        <Empty description="暂无图片" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {media.map(m => (
            <div key={m.id} style={{ border: '1px solid var(--line)', background: 'var(--paper)', padding: 10, position: 'relative' }}>
              <Image src={m.thumb || m.file_path} style={{ width: '100%', height: 160, objectFit: 'cover' }} />
              <div style={{ marginTop: 8, fontSize: 13, fontWeight: 500 }}>{productName(m.product_id)}</div>
              <div className="text-ink-3" style={{ fontSize: 11, marginTop: 4 }}>{new Date(m.created_at).toLocaleString()}</div>
              <div style={{ position: 'absolute', top: 8, right: 8 }}>
                <Popconfirm title="删除该图片？" onConfirm={() => remove(m.id)}>
                  <Button size="small" danger>删除</Button>
                </Popconfirm>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
