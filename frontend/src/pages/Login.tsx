import { useState } from 'react';
import { Form, Input, Button, message, App } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/store';

const ROLES: Array<{ username: string; label: string; desc: string }> = [
  { username: 'boss',      label: '老板',  desc: '查看全部数据 / 报表' },
  { username: 'finance',   label: '财务',  desc: '收款付款 / 账户流水' },
  { username: 'warehouse', label: '仓储',  desc: '产品 / 库存 / 出入库' },
  { username: 'sales01',   label: '销售',  desc: '客户 / 销售 / 佣金' },
];

export default function Login() {
  const nav = useNavigate();
  const { message: msgApi } = App.useApp();
  const login = useAuth(s => s.login);
  const [username, setUsername] = useState('boss');
  const [password, setPassword] = useState('demo');
  const [busy, setBusy] = useState(false);

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
          <div className="stats">
            <div>
              <div className="stat-num">4</div>
              <div className="stat-label">业务角色</div>
            </div>
            <div>
              <div className="stat-num">20+</div>
              <div className="stat-label">业务模块</div>
            </div>
            <div>
              <div className="stat-num">6</div>
              <div className="stat-label">SKU</div>
            </div>
            <div>
              <div className="stat-num">5</div>
              <div className="stat-label">客户渠道</div>
            </div>
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
