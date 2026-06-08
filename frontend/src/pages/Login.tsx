import { useState, useEffect } from 'react';
import { Form, Input, Button, message, App, Spin } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/store';
import { api } from '@/api/client';

const ROLES: Array<{ username: string; label: string; desc: string }> = [
  { username: 'boss',    label: '老板',  desc: '查看全部数据 / 报表' },
  { username: 'finance', label: '财务',  desc: '收款付款 / 账户流水' },
  { username: 'warehouse', label: '仓储', desc: '产品 / 库存 / 出入库' },
  { username: 'sales01', label: '销售',  desc: '客户 / 销售 / 佣金' },
];

interface ProductSummary {
  category: string;
  factory_code: string;
  spec: string;
  origin: string;
  qty_per_unit: number;
  prices: { price: number; remark: string }[];
}

export default function Login() {
  const nav = useNavigate();
  const { message: msgApi } = App.useApp();
  const login = useAuth(s => s.login);
  const [username, setUsername] = useState('boss');
  const [password, setPassword] = useState('demo');
  const [busy, setBusy] = useState(false);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // 登录页加载时预取产品列表（用 demo 账号拿 token）
  useEffect(() => {
    (async () => {
      setLoadingProducts(true);
      try {
        const res = await fetch('http://localhost:3003/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'boss', password: 'demo' }),
        });
        if (!res.ok) throw new Error('auth failed');
        const { access_token } = await res.json();
        const r = await fetch('http://localhost:3003/api/products', {
          headers: { Authorization: 'Bearer ' + access_token },
        });
        if (r.ok) setProducts(await r.json());
      } catch {
        // ignore — 静默跳过
      } finally {
        setLoadingProducts(false);
      }
    })();
  }, []);

  const onSubmit = async () => {
    if (!username) { msgApi.warning('请选择角色'); return; }
    setBusy(true);
    const ok = await login(username, password);
    setBusy(false);
    if (ok) {
      msgApi.success('登录成功');
      nav('/', { replace: true });
    } else {
      msgApi.error('登录失败');
    }
  };

  const formatPrice = (prices: ProductSummary['prices']) => {
    if (!prices?.length) return '—';
    return prices.map(p => `¥${p.price.toFixed(2)}${p.remark ? ` (${p.remark})` : ''}`).join(' / ');
  };

  return (
    <div className="login-bg">
      <div className="login-brand">
        <div>
          <h1>丰晟达</h1>
          <div className="sub">鸡爪供应链管理系统</div>
          <div className="desc">
            采购入库、冷链仓储、分销批发、零售配送 —<br />
            覆盖鸡爪全链路业务。
          </div>

          {/* 产品列表 */}
          <div style={{ marginTop: 40 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--ink-3)', marginBottom: 16, textTransform: 'uppercase' }}>产品目录</div>
            {loadingProducts ? (
              <Spin size="small" />
            ) : products.length === 0 ? (
              <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>暂无产品数据</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
                {products.map(p => (
                  <div key={p.factory_code} style={{
                    border: '1px solid var(--line)',
                    borderRadius: 6,
                    padding: '10px 14px',
                    background: 'var(--paper-2)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{p.category}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-3)' }}>{p.factory_code}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 12, color: 'var(--ink-2)' }}>
                      <span>规格: {p.spec}</span>
                      <span>产地: {p.origin}</span>
                      <span>库存: {p.qty_per_unit} 吨</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--copper)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                      {formatPrice(p.prices)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="footer">
          冷链 · 批发 · 配送 · 财务 ——
        </div>
      </div>

      <div className="login-form-wrap">
        <div className="login-form">
          <h2>账号登录</h2>
          <div className="form-sub">请输入工号与密码</div>

          <Form layout="vertical" onFinish={onSubmit}>
            <Form.Item>
              <div className="form-label">账号</div>
              <Input
                size="large"
                prefix={<UserOutlined />}
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="请输入工号"
              />
            </Form.Item>
            <Form.Item>
              <div className="form-label">密码</div>
              <Input.Password
                size="large"
                prefix={<LockOutlined />}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="请输入密码"
              />
            </Form.Item>
            <Button
              type="primary"
              size="large"
              className="submit-btn"
              htmlType="submit"
              loading={busy}
            >
              登录系统
            </Button>
          </Form>

          <div className="divider">DEMO ACCOUNTS</div>
          <div className="role-grid">
            {ROLES.map(r => (
              <div
                key={r.username}
                className={`role-tag ${username === r.username ? 'active' : ''}`}
                onClick={() => { setUsername(r.username); setPassword('demo'); }}
              >
                <div className="role-name">{r.label}</div>
                <div className="role-desc">{r.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}