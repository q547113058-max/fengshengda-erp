import { Card, Table, Button, Popconfirm, App, Space, Input } from 'antd';
import { useEffect, useState } from 'react';
import { useAuth } from '@/store';
import { canEdit as canEditPerm } from '@/utils/permissions';
import { api } from '@/api/client';
import EditModal, { FieldDef } from '@/components/EditModal';

export default function Tags() {
  const { message } = App.useApp();
  const user = useAuth(s => s.user)!;
  const canEdit = canEditPerm(user.role, 'products');
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const reload = () => {
    setLoading(true);
    api.list<any[]>('tags').then(setList).finally(() => setLoading(false));
  };
  useEffect(reload, []);

  const fields: FieldDef[] = [
    { name: 'name', label: '标签名', required: true },
    { name: 'sort_order', label: '排序', type: 'number', min: 0, step: 1 },
  ];

  const openNew = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (r: any) => { setEditing(r); setModalOpen(true); };
  const remove = async (id: number) => {
    try { await api.remove('tags', id); message.success('已删除'); reload(); } catch (e: any) { message.error(e.message); }
  };

  return (
    <Card
      title="标签管理"
      extra={canEdit && <Button type="primary" onClick={openNew}>+ 新增</Button>}
    >
      <Table
        size="small"
        loading={loading}
        rowKey="id"
        dataSource={list}
        pagination={false}
        columns={[
          { title: 'ID', dataIndex: 'id', width: 60 },
          { title: '标签名', dataIndex: 'name', width: 200 },
          { title: '排序', dataIndex: 'sort_order', width: 80 },
          {
            title: '操作', width: 120, align: 'right' as const,
            render: (_: any, r: any) => !canEdit ? null : (
              <Space>
                <Button size="small" onClick={() => openEdit(r)}>编辑</Button>
                {r.can_delete !== false && (
                  <Popconfirm title="删除？" onConfirm={() => remove(r.id)}>
                    <Button size="small" danger>删除</Button>
                  </Popconfirm>
                )}
              </Space>
            ),
          },
        ]}
      />
      <EditModal
        open={modalOpen}
        title={editing ? '编辑标签' : '新增标签'}
        fields={fields}
        initial={editing || {}}
        onCancel={() => setModalOpen(false)}
        onSubmit={async (v) => {
          if (editing) await api.update('tags', editing.id, v);
          else await api.create('tags', v);
          reload();
        }}
      />
    </Card>
  );
}
