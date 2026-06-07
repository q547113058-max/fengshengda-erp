import { Card, Table, Tag, Row, Col } from 'antd';
import { useEffect, useState } from 'react';
import { api } from '@/api/client';

const TYPE_LABEL: Record<string, { c: string; t: string }> = {
  public:     { c: 'gold',   t: '公账' },
  wx_private: { c: 'green',  t: '微信' },
  alipay:     { c: 'blue',   t: '支付宝' },
  cash:       { c: 'default',t: '现金' },
  other:      { c: 'default',t: '其他' },
};
const SOURCE_LABEL: Record<string, { c: string; t: string }> = {
  sale:       { c: 'green',  t: '销售' },
  commission: { c: 'gold',   t: '佣金' },
  purchase:   { c: 'volcano',t: '采购' },
  manual:     { c: 'blue',   t: '手工' },
};

export default function AccountLedger() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [tx, setTx] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.accounts(), api.transactions()])
      .then(([a, t]) => { setAccounts(a); setTx(t); })
      .finally(() => setLoading(false));
  }, []);

  // 预计算每条流水 + 账户名（避免 render 闭包）
  const txWithAccount = tx.map(t => {
    const a = accounts.find(x => x.id === t.account_id);
    const ins = tx.filter(x => x.account_id === t.account_id && x.direction === 'in').reduce((s, x) => s + x.amount, 0);
    const outs = tx.filter(x => x.account_id === t.account_id && x.direction === 'out').reduce((s, x) => s + x.amount, 0);
    return { ...t, accountName: a?.name || '—', balance: (a?.opening_balance || 0) + ins - outs };
  });

  return (
    <>
      <div className="section-head">
        <div className="title">支付账户</div>
        <div className="eyebrow">BALANCE</div>
      </div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {accounts.map(a => {
          const ins = tx.filter(t => t.account_id === a.id && t.direction === 'in').reduce((s, t) => s + t.amount, 0);
          const outs = tx.filter(t => t.account_id === a.id && t.direction === 'out').reduce((s, t) => s + t.amount, 0);
          const balance = a.opening_balance + ins - outs;
          return (
            <Col span={6} key={a.id}>
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="text-ink-3" style={{ fontSize: 11, letterSpacing: '0.1em' }}>{a.is_company ? '对公账户' : '内部账户'}</div>
                    <div style={{ fontWeight: 500, marginTop: 4 }}>{a.name}</div>
                    <Tag color={TYPE_LABEL[a.type]?.c} style={{ marginTop: 8 }}>{TYPE_LABEL[a.type]?.t || a.type}</Tag>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="text-ink-3" style={{ fontSize: 10, letterSpacing: '0.1em' }}>余额</div>
                    <div className="num-display" style={{ fontSize: 22 }}>¥ {balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    <div className="text-ink-3" style={{ fontSize: 11, marginTop: 4 }}>期初 ¥ {a.opening_balance.toLocaleString()}</div>
                  </div>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Card title="账户收支流水">
        <Table
          size="small"
          loading={loading}
          rowKey="id"
          dataSource={txWithAccount}
          pagination={{ pageSize: 15 }}
          columns={[
            { title: '时间', dataIndex: 'created_at', width: 160, render: (v: string) => new Date(v).toLocaleString() },
            { title: '账户', dataIndex: 'accountName', width: 160 },
            { title: '方向', dataIndex: 'direction', width: 80, render: (v: string) => v === 'in' ? <Tag color="success">收入</Tag> : <Tag color="error">支出</Tag> },
            { title: '类型', dataIndex: 'source_type', width: 90, render: (v: string) => <Tag color={SOURCE_LABEL[v]?.c}>{SOURCE_LABEL[v]?.t || v}</Tag> },
            { title: '对方', dataIndex: 'counter_party', width: 180 },
            { title: '金额', dataIndex: 'amount', width: 130, align: 'right' as const, render: (v: number, r: any) => (
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, color: r.direction === 'in' ? 'var(--moss)' : 'var(--burgundy)' }}>
                {r.direction === 'in' ? '+' : '-'}¥ {v.toLocaleString()}
              </span>
            )},
            { title: '关联单', dataIndex: 'ref_order_no', width: 140, render: (s: string) => s ? <span style={{ fontFamily: 'var(--font-mono)' }}>{s}</span> : '—' },
            { title: '备注', dataIndex: 'remark', ellipsis: true },
          ]}
        />
      </Card>
    </>
  );
}
