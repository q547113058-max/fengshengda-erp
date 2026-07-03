import { useNavigate } from 'react-router-dom';
import { Card, Table, Tag, Space, Button, Popconfirm, App } from 'antd';
import { useEffect, useState } from 'react';
import { useAuth } from '@/store';
import { canEdit as canEditPerm } from '@/utils/permissions';
import { api } from '@/api/client';
import EditModal, { FieldDef } from '@/components/EditModal';

export default function WebsiteProducts() {
  const { message } = App.useApp();
  const user = useAuth(s => s.user)!;
  const nav = useNavigate();
  const canEdit = canEditPerm(user.role, 'products');
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const reload = () => {
    setLoading(true);
    api.list<any[]>('website-products').then(setList).finally(() => setLoading(false));
  };
  useEffect(reload, []);

  const fields: FieldDef[] = [
    { name: 'category',     label: '品名', required: true, placeholder: '如：卤鸡爪' },
    { name: 'factory_code', label: '厂号', required: true, placeholder: '如：JZ-LJ-001' },
    { name: 'spec',         label: '规格', placeholder: '如：35+' },
    { name: 'grade',        label: '等级', type: 'select', options: [{ value: 'A级', label: 'A级' }, { value: 'B级', label: 'B级' }, { value: '精品', label: '精品' }] },
    { name: 'origin',       label: '产地', placeholder: '如：山东聊城' },
    { name: 'goods_location', label: '提货地', placeholder: '如：佛山冷库A' },
    { name: 'price',        label: '展示价(元/吨)', type: 'number', min: 0, step: 0.01, placeholder: '如：18.80' },
    { name: 'price_remark', label: '价格备注', placeholder: '如：农副价' },
    { name: 'remark',       label: '备注', type: 'textarea' },
  ];

  const openNew = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (r: any) => { setEditing(r); setModalOpen(true); };
  const remove = async (id: number) => {
    try { await api.remove('website-products', id); message.success('已删除'); reload(); } catch (e: any) { message.error(e.message); }
  };

  return (
    <Card
      title="官网产品"
      extra={canEdit && <Button type="primary" onClick={openNew}>+ 新增</Button>}
    >
      <Table
        size="small"
        loading={loading}
        rowKey="id"
        dataSource={list}
        onRow={(r: any) => ({ onClick: () => nav(`/website-products/${r.id}`), style: { cursor: "pointer" } })}
        pagination={{ pageSize: 20 }}
        columns={[
          { title: '品名', dataIndex: 'category', width: 120, render: (v: string, r: any) => (
            <div><div style={{ fontWeight: 500 }}>{v}</div>
            {r.remark && <div className="text-ink-3" style={{ fontSize: 11 }}>{r.remark}</div>}</div>
          )},
          { title: '厂号', dataIndex: 'factory_code', width: 120 },
          { title: '规格', dataIndex: 'spec', width: 100 },
          { title: '等级', dataIndex: 'grade', width: 80, render: (v: string) => v ? <Tag color="processing">{v}</Tag> : '—' },
          { title: '产地', dataIndex: 'origin', width: 100 },
          { title: '提货地', dataIndex: 'goods_location', width: 130 },
          { title: '展示价', dataIndex: 'price', width: 100, render: (v: number) => v ? <span style={{ color: '#dc2626', fontWeight: 600 }}>¥ {v.toFixed(2)}</span> : '—' },
          { title: '价格备注', dataIndex: 'price_remark', width: 100 },
          {
            title: '操作', width: 120, align: 'right' as const,
            render: (_: any, r: any) => !canEdit ? null : (
              <Space>
                <Button size="small" onClick={() => openEdit(r)}>编辑</Button>
                <Popconfirm title="删除？" onConfirm={() => remove(r.id)}>
                  <Button size="small" danger>删除</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      <EditModal
        open={modalOpen}
        title={editing ? '编辑官网产品' : '新增官网产品'}
        fields={fields}
        initial={editing || {}}
        onCancel={() => setModalOpen(false)}
        onSubmit={async (v) => {
          if (editing) await api.update('website-products', editing.id, v);
          else await api.create('website-products', v);
          reload();
        }}
      />
    </Card>
  );
}
