import { Card, Table, Tag, Space, Button, App } from 'antd';
import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import EditModal, { FieldDef } from '@/components/EditModal';
import { useAuth } from '@/store';

const SOURCE_LABEL: Record<string, { c: string; t: string }> = {
  sale:       { c: 'green',  t: '销售收款' },
  commission: { c: 'gold',   t: '佣金支出' },
  purchase:   { c: 'volcano',t: '采购付款' },
  manual:     { c: 'blue',   t: '手工记账' },
};

export default function FinancePay() {
  const { message } = App.useApp();
  const [list, setList] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const currentUser = useAuth(s => s.user);

  const reload = () => {
    setLoading(true);
    Promise.all([api.transactions('out'), api.accounts(), api.users()])
      .then(([t, a, u]) => { setList(t); setAccounts(a); setUsers(u); })
      .finally(() => setLoading(false));
  };
  useEffect(reload, []);

  const aname = (id: number) => accounts.find(x => x.id === id)?.name || `#${id}`;
  const uname = (id: number) => users.find(x => x.id === id)?.full_name || `#${id}`;

  const total = list.reduce((a, b) => a + b.amount, 0);
  const purchaseOut = list.filter(x => x.source_type === 'purchase').reduce((a, b) => a + b.amount, 0);
  const commissionOut = list.filter(x => x.source_type === 'commission').reduce((a, b) => a + b.amount, 0);

  const fields: FieldDef[] = [
    { name: 'account_id', label: '付款账户', type: 'select', required: true, options: accounts.map(a => ({ value: a.id, label: a.name })) },
    { name: 'amount', label: '金额', type: 'number', required: true, min: 0.01, step: 0.01 },
    { name: 'source_type', label: '类型', type: 'select', required: true, options: [
      { value: 'purchase', label: '采购付款' }, { value: 'commission', label: '佣金支出' }, { value: 'manual', label: '手工记账' },
    ], initialValue: 'manual' },
    { name: 'counter_party', label: '对方（供应商/人名）' },
    { name: 'ref_order_no', label: '关联单号' },
    { name: 'remark', label: '备注', type: 'textarea' },
    { name: 'receipt_url', label: '付款凭证（图片）', type: 'upload' },
  ];

  return (
    <Card
      title="财务付款"
      extra={
        <Space>
          <span className="text-ink-3" style={{ fontSize: 12 }}>本月付款 ¥ {total.toLocaleString()}（采购 ¥ {purchaseOut.toLocaleString()} / 佣金 ¥ {commissionOut.toFixed(0)}）</span>
          <Button type="primary" onClick={() => setModalOpen(true)}>+ 登记付款</Button>
        </Space>
      }
    >
      <Table
        size="small"
        loading={loading}
        rowKey="id"
        dataSource={list}
        pagination={{ pageSize: 20 }}
        columns={[
          { title: '日期', dataIndex: 'created_at', width: 160, render: (v: string) => new Date(v).toLocaleString() },
          { title: '类型', dataIndex: 'source_type', width: 110, render: (v: string) => <Tag color={SOURCE_LABEL[v]?.c}>{SOURCE_LABEL[v]?.t || v}</Tag> },
          { title: '付款账户', dataIndex: 'account_id', width: 160, render: aname },
          { title: '对方', dataIndex: 'counter_party', width: 180 },
          { title: '金额', dataIndex: 'amount', width: 130, align: 'right' as const, render: (v: number) => <span className="text-burgundy" style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600 }}>-¥ {v.toLocaleString()}</span> },
          { title: '凭证', dataIndex: 'receipt_url', width: 80, render: (v: string) => v ? <a href={v} target="_blank" rel="noopener">查看</a> : '—' },
          { title: '关联单', dataIndex: 'ref_order_no', width: 150, render: (s: string) => s ? <span style={{ fontFamily: 'var(--font-mono)' }}>{s}</span> : '—' },
          { title: '经办人', dataIndex: 'operator_id', width: 100, render: uname },
          { title: '备注', dataIndex: 'remark', ellipsis: true },
        ]}
      />
      <EditModal
        open={modalOpen}
        title="登记付款"
        fields={fields}
        onCancel={() => setModalOpen(false)}
        onSubmit={async (v) => {
          await api.create('finance/transactions', { ...v, direction: 'out', source_type: v.source_type || 'manual', operator_id: currentUser?.id });
          message.success('付款已登记');
          reload();
        }}
      />
    </Card>
  );
}
