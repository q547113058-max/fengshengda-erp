import { Card, Table, Tag, Space, Segmented, Button, App } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import EditModal, { FieldDef } from '@/components/EditModal';

const TYPE_LABEL: Record<string, { c: string; t: string }> = {
  in: { c: 'green', t: '入库' }, out: { c: 'red', t: '出库' },
  transfer: { c: 'gold', t: '调拨' }, loss: { c: 'volcano', t: '损耗' }, return: { c: 'blue', t: '退货' },
};

export default function Movements() {
  const nav = useNavigate();
  const { message } = App.useApp();
  const [list, setList] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [type, setType] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const reload = () => {
    setLoading(true);
    Promise.all([api.movements(type || undefined), api.inventoryBatches(), api.products()])
      .then(([mv, b, p]) => { setList(mv); setBatches(b); setProducts(p); })
      .finally(() => setLoading(false));
  };
  useEffect(reload, [type]);

  const batchNo = (id: number) => batches.find(b => b.id === id)?.batch_no || `#${id}`;
  const productOfBatch = (id: number) => {
    const b = batches.find(x => x.id === id);
    if (!b) return `#${id}`;
    const p = products.find(x => x.id === b.product_id);
    return p ? `${p.category} · ${p.factory_code}` : `产品#${b.product_id}`;
  };
  const productIdOfBatch = (id: number) => batches.find(x => x.id === id)?.product_id;

  const fields: FieldDef[] = [
    { name: 'batch_id', label: '批次', type: 'select', required: true,
      options: batches.map(b => ({ value: b.id, label: `${b.batch_no} · ${productOfBatch(b.id)} (剩 ${b.qty_remaining} 吨)` })) },
    { name: 'type', label: '类型', type: 'select', required: true, options: [
      { value: 'in', label: '入库' }, { value: 'out', label: '出库' },
      { value: 'transfer', label: '调拨' }, { value: 'loss', label: '损耗' }, { value: 'return', label: '退货' },
    ] },
    { name: 'qty', label: '数量（吨）', type: 'number', required: true, min: 1 },
    { name: 'operator', label: '操作人', initialValue: '黄仓管' },
    { name: 'to_holder', label: '去向 / 接手人' },
    { name: 'ref_order_no', label: '关联单号' },
    { name: 'remark', label: '备注', type: 'textarea' },
    { name: 'image', label: '凭证/实物图片', type: 'upload' },
    { name: 'image_remark', label: '图片备注', placeholder: '如：到货实拍、出库签收照' },
  ];

  return (
    <Card
      title="出入库记录"
      extra={
        <Space>
          <Segmented
            value={type}
            onChange={(v: any) => setType(v)}
            options={[
              { label: '全部', value: '' }, { label: '入库', value: 'in' }, { label: '出库', value: 'out' }, { label: '调拨', value: 'transfer' },
            ]}
          />
          <Button type="primary" onClick={() => setModalOpen(true)}>+ 登记出入库</Button>
        </Space>
      }
    >
      <Table
        size="small"
        loading={loading}
        rowKey="id"
        dataSource={list}
        pagination={{ pageSize: 20 }}
        onRow={(r: any) => ({ onClick: () => nav(`/inventory/batch/${r.batch_id}`), style: { cursor: 'pointer' } })}
        columns={[
          { title: '时间', dataIndex: 'created_at', width: 160, render: (v: string) => new Date(v).toLocaleString() },
          { title: '类型', dataIndex: 'type', width: 90, render: (v: string) => <Tag color={TYPE_LABEL[v]?.c}>{TYPE_LABEL[v]?.t || v}</Tag> },
          { title: '产品', dataIndex: 'batch_id', width: 200, render: (id: number) => productOfBatch(id) },
          { title: '批次号', dataIndex: 'batch_id', width: 140, render: (id: number) => <span style={{ fontFamily: 'var(--font-mono)' }}>{batchNo(id)}</span> },
          { title: '数量', dataIndex: 'qty', width: 80, align: 'right' as const, render: (v: number, r: any) => (
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, color: r.type === 'in' ? 'var(--moss)' : 'var(--burgundy)' }}>
              {r.type === 'in' || r.type === 'return' ? `+${v}` : r.type === 'out' || r.type === 'loss' ? `-${v}` : v}
            </span>
          )},
          { title: '操作人', dataIndex: 'operator', width: 90 },
          { title: '去向', dataIndex: 'to_holder', width: 130, render: (s: string) => s || '—' },
          { title: '关联单', dataIndex: 'ref_order_no', width: 140, render: (s: string) => s ? <span style={{ fontFamily: 'var(--font-mono)' }}>{s}</span> : '—' },
          { title: '备注', dataIndex: 'remark', ellipsis: true, render: (s: string) => s || '—' },
        ]}
      />
      <EditModal
        open={modalOpen}
        title="登记出入库"
        fields={fields}
        initial={{ type: 'in', qty: 1 }}
        onCancel={() => setModalOpen(false)}
        onSubmit={async (v) => {
          // 分离图片字段（DTO 不接受）
          const { image, image_remark, ...movementData } = v;
          // 1. 创建出入库记录
          await api.addMovement(movementData);
          // 2. 如果有图片，上传并关联
          if (image) {
            const batchId = v.batch_id;
            const productId = productIdOfBatch(batchId);
            // 入库/退货 → 同步到产品图片资料（设 product_id）
            const syncToProduct = (v.type === 'in' || v.type === 'return') && productId;
            await api.uploadFile(image, {
              product_id: syncToProduct ? productId : undefined,
              batch_id: batchId,
              type: 'image',
              remark: image_remark || `${TYPE_LABEL[v.type]?.t || v.type}凭证`,
            });
          }
          message.success('已登记');
          reload();
        }}
      />
    </Card>
  );
}
