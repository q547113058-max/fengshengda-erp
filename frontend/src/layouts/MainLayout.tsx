import { useEffect, useMemo } from 'react';
import { Layout, Menu, Dropdown, Avatar, App as AntApp } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  DashboardOutlined, AppstoreOutlined, ShoppingCartOutlined, ShopOutlined,
  ContainerOutlined, FileTextOutlined, PictureOutlined, ShoppingOutlined,
  TeamOutlined, UserOutlined, DollarOutlined, AccountBookOutlined,
  SettingOutlined, LogoutOutlined,
} from '@ant-design/icons';
import { useAuth, Role } from '@/store';
import dayjs from 'dayjs';

const { Header, Sider, Content } = Layout;

interface NavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  section: string;
  roles: Role[];
}

const NAV: NavItem[] = [
  { key: '/',              label: '概览',       icon: <DashboardOutlined />,    section: '概览',  roles: ['boss','finance','warehouse','sales'] },
  { key: '/products',      label: '产品',       icon: <AppstoreOutlined />,     section: '产品',  roles: ['boss','finance','warehouse','sales'] },
  { key: '/purchase',      label: '采购',       icon: <ShoppingCartOutlined />, section: '采购',  roles: ['boss','finance','warehouse'] },
  { key: '/suppliers',     label: '供应商',     icon: <ShopOutlined />,         section: '采购',  roles: ['boss','finance','warehouse'] },
  { key: '/inventory',     label: '库存',       icon: <ContainerOutlined />,    section: '仓储',  roles: ['boss','finance','warehouse'] },
  { key: '/movements',     label: '出入库',     icon: <FileTextOutlined />,     section: '仓储',  roles: ['boss','finance','warehouse'] },
  { key: '/media',         label: '图片资料',   icon: <PictureOutlined />,      section: '仓储',  roles: ['boss','finance','warehouse'] },
  { key: '/sales',         label: '销售',       icon: <ShoppingOutlined />,     section: '销售',  roles: ['boss','finance','sales'] },
  { key: '/customers',     label: '客户',       icon: <TeamOutlined />,         section: '销售',  roles: ['boss','finance','sales'] },
  { key: '/salesman',      label: '业绩',       icon: <UserOutlined />,         section: '销售',  roles: ['boss','finance','sales'] },
  { key: '/commission',    label: '佣金',       icon: <AccountBookOutlined />,  section: '销售',  roles: ['boss','finance','sales'] },
  { key: '/finance/receive',label: '收款',      icon: <DollarOutlined />,       section: '财务',  roles: ['boss','finance'] },
  { key: '/finance/pay',   label: '付款',       icon: <DollarOutlined />,       section: '财务',  roles: ['boss','finance'] },
  { key: '/finance/ledger',label: '账户流水',   icon: <AccountBookOutlined />,  section: '财务',  roles: ['boss','finance'] },

  { key: '/settings/users',label: '用户权限',   icon: <SettingOutlined />,      section: '系统',  roles: ['boss'] },
];

const SECTION_ORDER = ['概览','产品','采购','仓储','销售','财务','系统'];

const ROLE_LABEL: Record<Role, string> = {
  boss: '老板', finance: '财务', warehouse: '仓储', sales: '销售',
};

export default function MainLayout() {
  const nav = useNavigate();
  const loc = useLocation();
  const { modal } = AntApp.useApp();
  const user = useAuth(s => s.user);
  const logout = useAuth(s => s.logout);

  const sections = useMemo(() => {
    if (!user) return [];
    return SECTION_ORDER.map(name => ({
      name,
      items: NAV.filter(n => n.section === name && n.roles.includes(user.role)),
    })).filter(s => s.items.length > 0);
  }, [user]);

  const currentPage = NAV.find(n => n.key === loc.pathname);

  // 在 useEffect 里跳转（避免 render 阶段 setState-during-render 警告）
  useEffect(() => {
    if (!user) nav('/login', { replace: true });
  }, [user, nav]);

  if (!user) return null;

  const onLogout = () => {
    modal.confirm({
      title: '退出登录',
      content: '确认退出当前账号？',
      okText: '退出',
      cancelText: '取消',
      onOk: () => { logout(); nav('/login', { replace: true }); },
    });
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={240} className="layout-sider">
        <div className="layout-sider-brand">
          <h1>丰晟达</h1>
          <div className="sub">鸡爪供应链 ERP</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sections.map(sec => (
            <div key={sec.name}>
              <div className="layout-sider-section">{sec.name}</div>
              <Menu
                mode="inline"
                selectedKeys={[loc.pathname]}
                onClick={({ key }) => nav(key)}
                style={{ borderRight: 0, padding: '0 12px' }}
                items={sec.items.map(i => ({ key: i.key, icon: i.icon, label: i.label }))}
              />
            </div>
          ))}
        </div>
        <div className="layout-sider-foot">系统版本 v0.1 · 2026</div>
      </Sider>
      <Layout>
        <Header className="layout-header">
          <h2 className="page-title">
            {currentPage?.label ?? '丰晟达 ERP'}
            <span className="num">/ {dayjs().format('YYYY年M月D日')}</span>
          </h2>
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                { key: 'profile', label: '个人资料', icon: <UserOutlined />, onClick: () => nav('/settings/users?editSelf=true') },
                { type: 'divider' },
                { key: 'logout',  label: '退出登录', icon: <LogoutOutlined />, onClick: onLogout },
              ],
            }}
            placement="bottomRight"
          >
            <div className="user-chip" style={{ cursor: 'pointer' }}>
              <Avatar size={28} style={{ background: 'var(--ink)', fontSize: 12 }}>{(user.full_name ?? user.username ?? '?')[0]}</Avatar>
              <div>
                <div className="name">{user.full_name || user.username || '-'}</div>
                <div className="role">{ROLE_LABEL[user.role]}</div>
              </div>
            </div>
          </Dropdown>
        </Header>
        <Content className="layout-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
