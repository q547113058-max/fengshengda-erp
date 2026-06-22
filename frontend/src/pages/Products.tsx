import { Card, Table, Tag, Input, Select, Space, Button, Popconfirm, App } from 'antd';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/store';
import { canEdit as canEditPerm } from '@/utils/permissions';
import { api } from '@/api/client';
import EditModal, { FieldDef } from '@/components/EditModal';

export default function Products() {
  const nav = useNavigate();
  const { message } = App.useApp();
  const user = useAuth(s => s.user)!;
  const canEdit = canEditPerm(user.role, 'products');
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kw, setKw] = useState('');
  const [grade, setGrade] = useState<string>('');
  const [origin, setOrigin] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const reload = () => {
    setLoading(true);
    api.products().then(setList).finally(() => setLoading(false));
  };
  useEffect(reload, []);

  const grades = useMemo(() => Array.from(new Set(list.map(p => p.grade).filter(Boolean))), [list]);
  const origins = useMemo(() => Array.from(new Set(list.map(p => p.origin).filter(Boolean))), [list]);

  const filtered = list.filter(p => {
    if (kw && !`${p.category} ${p.factory_code} ${p.spec}`.toLowerCase().includes(kw.toLowerCase())) return false;
    if (grade && p.grade !== grade) return false;
    if (origin && p.origin !== origin) return false;
    return true;
  });

  const newFields: FieldDef[] = [
    { name: 'category',     label: '品类', required: true, placeholder: '如：卤鸡爪' },
    { name: 'origin',       label: '产地', required: true, placeholder: '如：山东聊城' },
    { name: 'factory_code', label: '厂号', required: true, placeholder: '如：JZ-LJ-001' },
    { name: 'spec',         label: '规格', required: true, placeholder: '如：35+' },
    { name: 'grade',        label: '等级', type: 'select', options: [{ value: 'A级', label: 'A级' }, { value: 'B级', label: 'B级' }, { value: '精品', label: '精品' }] },
    { name: 'qty_per_unit', label: '库存(吨)', type: 'number', min: 0, step: 1, placeholder: '如：10' },
    { name: 'goods_location', label: '货地', placeholder: '如：佛山冷库A' },
    { name: 'price',        label: '单价(元/吨)', type: 'number', min: 0, step: 0.01, placeholder: '如：18.80' },
    { name: 'price_remark', label: '价格备注', placeholder: '如：1%农副价、散客价' },
    { name: 'remark',       label: '备注', type: 'textarea' },
  ];
  const editFields: FieldDef[] = [
    { name: 'category',     label: '品类', required: true },
    { name: 'origin',       label: '产地', required: true },
    { name: 'factory_code', label: '厂号', required: true },
    { name: 'spec',         label: '规格', required: true },
    { name: 'grade',        label: '等级', type: 'select', options: [{ value: 'A级', label: 'A级' }, { value: 'B级', label: 'B级' }, { value: '精品', label: '精品' }] },
    { name: 'qty_per_unit', label: '库存(吨)', type: 'number', min: 0, step: 1 },
    { name: 'goods_location', label: '货地' },
    { name: 'remark',       label: '备注', type: 'textarea' },
  ];
  const fields = editing ? editFields : newFields;

  const openNew = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (r: any, e: any) => { e.stopPropagation(); setEditing(r); setModalOpen(true); };
  const remove = async (id: number, e: any) => {
    e.stopPropagation();
    try {
      await api.remove('products', id);
      message.success('已删除');
      reload();
    } catch (e: any) { message.error(e.message); }
  };

  return (
    <Card
      title="产品信息"
      extra={
        <Space>
          <Input.Search placeholder="搜索品类/厂号/规格" value={kw} onChange={e => setKw(e.target.value)} allowClear style={{ width: 200 }} />
          <Select placeholder="等级" value={grade} onChange={setGrade} allowClear style={{ width: 90 }}>
            {grades.map(g => <Select.Option key={g} value={g}>{g}</Select.Option>)}
          </Select>
          <Select placeholder="产地" value={origin} onChange={setOrigin} allowClear style={{ width: 130 }}>
            {origins.map(o => <Select.Option key={o} value={o}>{o}</Select.Option>)}
          </Select>
          {canEdit && <Button type="primary" onClick={openNew}>+ 新增产品</Button>}
        </Space>
      }
    >
      <Table
        size="small"
        loading={loading}
        rowKey="id"
        dataSource={filtered}
        pagination={{ pageSize: 20 }}
        onRow={(r: any) => ({ onClick: () => nav(`/products/${r.id}`), style: { cursor: 'pointer' } })}
        columns={[
          { title: '品类', dataIndex: 'category', width: 120, render: (v: string, r: any) => (
            <div>
              <div style={{ fontWeight: 500 }}>{v}</div>
              {r.remark && <div className="text-ink-3" style={{ fontSize: 11 }}>{r.remark}</div>}
            </div>
          )},
          { title: '厂号', dataIndex: 'factory_code', width: 120, render: (v: string) => <span style={{ fontFamily: 'var(--font-mono)' }}>{v}</span> },
          { title: '规格', dataIndex: 'spec', width: 80 },
          { title: '产地', dataIndex: 'origin', width: 100 },
          { title: '等级', dataIndex: 'grade', width: 80, render: (v: string) => <Tag color="processing">{v}</Tag> },
          { title: '货地', dataIndex: 'goods_location', width: 130, render: (s: string) => <span className="text-ink-3">{s}</span> },
          {
            title: '价格', dataIndex: 'prices', width: 200,
            render: (prices: any[]) => {
              if (!prices?.length) return <span className="text-ink-3">—</span>;
              return (
                <div style={{ lineHeight: 1.6 }}>
                  {prices.map((p, i) => (
                    <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                      ¥ {p.price.toFixed(2)}
                      {p.remark && <span className="text-ink-3" style={{ fontFamily: 'var(--font)', marginLeft: 6, fontSize: 11 }}>({p.remark})</span>}
                    </div>
                  ))}
                </div>
              );
            },
          },
          { title: '库存(吨)', dataIndex: 'qty_per_unit', width: 100, align: 'right' as const, render: (v: number) => <span style={{ fontFamily: 'var(--font-mono)' }}>{v} 吨</span> },
          {
            title: '操作', width: 140, align: 'right' as const, fixed: 'right' as const,
            render: (_: any, r: any) => !canEdit ? null : (
              <Space onClick={e => e.stopPropagation()}>
                <Button size="small" onClick={e => openEdit(r, e)}>编辑</Button>
                <Popconfirm title="删除该产品？" onConfirm={e => remove(r.id, e)}>
                  <Button size="small" danger>删除</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      <EditModal
        open={modalOpen}
        title={editing ? `编辑产品 #${editing.id}` : '新增产品'}
        fields={fields}
        initial={editing || {}}
        onCancel={() => setModalOpen(false)}
        onSubmit={async (v) => {
          // 提取价格字段，组装成 prices 数组
          const { price, price_remark, ...productData } = v;
          if (price) {
            productData.prices = [{ price, remark: price_remark || '' }];
          }
          if (editing) await api.update('products', editing.id, productData);
          else await api.create('products', productData);
          reload();
        }}
      />
    </Card>
  );
}
