import { Row, Col, Card, Table, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/store';
import { api } from '@/api/client';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const ROLE_LABEL: Record<string, string> = { boss: '老板', finance: '财务', warehouse: '仓储', sales: '销售' };

const MONTH_LABELS: Record<string, string> = {
  '01': '1月', '02': '2月', '03': '3月', '04': '4月', '05': '5月', '06': '6月',
  '07': '7月', '08': '8月', '09': '9月', '10': '10月', '11': '11月', '12': '12月',
};

function fmtMonth(yyyymm: string) {
  const m = yyyymm.slice(5);
  return MONTH_LABELS[m] || yyyymm;
}

export default function Dashboard() {
  const nav = useNavigate();
  const user = useAuth(s => s.user)!;
  const [kpi, setKpi] = useState<any>(null);
  const [trends, setTrends] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.dashboardKpi(), api.dashboardTrends()])
      .then(([kpiData, trendData]) => {
        setKpi(kpiData);
        setTrends(trendData);
      })
      .catch(async (e: any) => {
        console.error(e);
        if (e?.status === 401) {
          useAuth.getState().logout();
          nav('/login', { replace: true });
        }
      })
      .finally(() => setLoading(false));
  }, [nav]);

  if (loading || !kpi) {
    return <Card loading={loading} />;
  }

  const totalCust = Object.values(kpi.byType as Record<string, number>).reduce((a, b) => a + b, 0);
  const typeEntries = Object.entries(kpi.byType as Record<string, number>);

  // 组装图表数据
  const trendData = trends
    ? trends.months.map((m: string, i: number) => ({
        month: fmtMonth(m),
        sale: trends.saleTrend[i]?.amount || 0,
        purchase: trends.purchaseTrend[i]?.amount || 0,
        income: trends.incomeTrend[i]?.amount || 0,
        expense: trends.expenseTrend[i]?.amount || 0,
      }))
    : [];

  return (
    <>
      {/* 顶部欢迎条 */}
      <div className="dashboard-topbar">
        <h1>欢迎，{user.full_name || user.username || ''}</h1>
        <div className="kpi-pills">
          <div className="kpi-pill">
            <span className="pill-label">采购待结</span>
            <span className="pill-num text-burgundy">{kpi.unpaidPoCount}</span>
          </div>
          <div className="kpi-pill">
            <span className="pill-label">销售待收</span>
            <span className="pill-num text-burgundy">{kpi.unpaidSoCount}</span>
          </div>
          <div className="kpi-pill">
            <span className="pill-label">低库存</span>
            <span className="pill-num text-copper">{kpi.lowStock.filter((x: any) => x.qty > 0 && x.qty < 200).length}</span>
          </div>
        </div>
      </div>

      {/* 4 个核心 KPI */}
      <div className="dashboard-kpi-grid">
        <div className="dashboard-kpi-cell">
          <div className="kpi-trend">本月</div>
          <div className="kpi-label">销售总额（元）</div>
          <div className="num-display">¥ {kpi.monthSaleAmt.toLocaleString()}</div>
        </div>
        <div className="dashboard-kpi-cell">
          <div className="kpi-trend">本月</div>
          <div className="kpi-label">采购总额（元）</div>
          <div className="num-display copper">¥ {kpi.monthPurchaseAmt.toLocaleString()}</div>
        </div>
        <div className="dashboard-kpi-cell">
          <div className="kpi-trend">实时</div>
          <div className="kpi-label">账户总余额（元）</div>
          <div className="num-display moss">¥ {kpi.accountBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
        </div>
        <div className="dashboard-kpi-cell">
          <div className="kpi-trend">{kpi.batchCount} 批次</div>
          <div className="kpi-label">在库库存（吨）</div>
          <div className="num-display">📦 {kpi.totalStockQty.toLocaleString()}</div>
        </div>
      </div>

      {/* 趋势图表 */}
      <Row gutter={24} style={{ marginTop: 24 }}>
        <Col span={12}>
          <Card
            title="销售 vs 采购趋势"
            extra={<span className="text-ink-3" style={{ fontSize: 11, letterSpacing: '0.1em' }}>近6个月</span>}
          >
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => v >= 10000 ? `${(v / 10000).toFixed(1)}万` : v} />
                <Tooltip formatter={(v: any) => `¥ ${Number(v).toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="sale" name="销售" stroke="#2c5282" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="purchase" name="采购" stroke="#a3b18a" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={12}>
          <Card
            title="收支流水趋势"
            extra={<span className="text-ink-3" style={{ fontSize: 11, letterSpacing: '0.1em' }}>近6个月</span>}
          >
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => v >= 10000 ? `${(v / 10000).toFixed(1)}万` : v} />
                <Tooltip formatter={(v: any) => `¥ ${Number(v).toLocaleString()}`} />
                <Legend />
                <Bar dataKey="income" name="收入" fill="#2c5282" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="支出" fill="#c0392b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* 下半：低库存预警 + 客户渠道结构 */}
      <div className="dashboard-bottom" style={{ marginTop: 24 }}>
        <Card
          title="仓储预警 · 低库存 Top 5"
          extra={<span className="text-ink-3" style={{ fontSize: 11, letterSpacing: '0.1em' }}>LOW STOCK</span>}
        >
          <Table
            size="small"
            pagination={false}
            rowKey={(r: any) => r.product.id}
            dataSource={kpi.lowStock}
            onRow={(r: any) => ({ onClick: () => nav(`/products/${r.product.id}`), style: { cursor: 'pointer' } })}
            columns={[
              { title: '产品', key: 'name', render: (_: any, r: any) => (
                <div>
                  <div style={{ fontWeight: 500 }}>{r.product.category}</div>
                  <div className="text-ink-3" style={{ fontSize: 11 }}>{r.product.factory_code} · {r.product.spec}</div>
                </div>
              ) },
              { title: '货地', dataIndex: ['product', 'goods_location'], width: 130, render: (s: string) => <span className="text-ink-3">{s}</span> },
              { title: '剩余（吨）', dataIndex: 'qty', width: 110, align: 'right' as const, render: (v: number) => (
                <span className={v < 200 ? 'text-burgundy' : 'text-copper'} style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{v}</span>
              ) },
              { title: '状态', width: 90, render: (_: any, r: any) => (
                r.qty === 0 ? <Tag color="red">缺货</Tag>
                : r.qty < 200 ? <Tag color="red">紧急</Tag>
                : <Tag color="gold">偏低</Tag>
              ) },
            ]}
          />
        </Card>

        <Card
          title="客户渠道结构"
          extra={<span className="text-ink-3" style={{ fontSize: 11, letterSpacing: '0.1em' }}>CHANNELS</span>}
        >
          <div className="section-head">
            <div className="title">按客户类型</div>
            <div className="eyebrow">{totalCust} 客户</div>
          </div>
          <div className="channel-list">
            {typeEntries.sort((a,b) => b[1] - a[1]).map(([name, n]) => (
              <div className="row" key={name}>
                <div className="name">{name}</div>
                <div className="bar"><div className="fill" style={{ width: `${(n / totalCust) * 100}%` }} /></div>
                <div className="count">{n}</div>
              </div>
            ))}
          </div>

        </Card>
      </div>

      {/* 底部应收账款 / 应付账款 */}
      <Row gutter={24} style={{ marginTop: 24 }}>
        <Col span={12}>
          <Card title="应付账款（采购）">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <div className="text-ink-3" style={{ fontSize: 12, letterSpacing: '0.08em', marginBottom: 8 }}>未结 {kpi.unpaidPoCount} 笔</div>
                <div className="num-display burgundy">¥ {kpi.unpaidPoAmt.toLocaleString()}</div>
              </div>
              <a onClick={() => nav('/finance/pay')} style={{ color: 'var(--copper)' }}>查看付款 →</a>
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="应收账款（销售）">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <div className="text-ink-3" style={{ fontSize: 12, letterSpacing: '0.08em', marginBottom: 8 }}>未收 {kpi.unpaidSoCount} 笔</div>
                <div className="num-display copper">¥ {kpi.unpaidSoAmt.toLocaleString()}</div>
              </div>
              <a onClick={() => nav('/finance/receive')} style={{ color: 'var(--copper)' }}>查看收款 →</a>
            </div>
          </Card>
        </Col>
      </Row>
    </>
  );
}
