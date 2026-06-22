import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Purchase from './pages/Purchase';
import Suppliers from './pages/Suppliers';
import Inventory from './pages/Inventory';
import BatchDetail from './pages/BatchDetail';
import Movements from './pages/Movements';
import Media from './pages/Media';
import Sales from './pages/Sales';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Salesman from './pages/Salesman';
import Commission from './pages/Commission';
import FinanceReceive from './pages/FinanceReceive';
import FinancePay from './pages/FinancePay';
import AccountLedger from './pages/AccountLedger';

import UserSettings from './pages/UserSettings';
import { useAuth, Role } from './store';
import { Component, ReactNode, useEffect } from 'react';

class ErrBoundary extends Component<{ children: ReactNode }, { err?: string }> {
  state = { err: undefined as string | undefined };
  static getDerivedStateFromError(err: Error) { return { err: err.message }; }
  componentDidCatch(err: Error) { console.error(err); }
  render() { return this.state.err ? <div className="err-screen">{this.state.err}</div> : this.props.children; }
}

function Guard({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const user = useAuth(s => s.user);
  const loc = useLocation();
  const nav = useNavigate();

  // 检查 token 是否存在（JWT 24h 过期后 user 仍在 localStorage 但 token 没了）
  const hasToken = (() => { try { return !!localStorage.getItem('fsd-token'); } catch { return false; } })();

  // 在 useEffect 里跳转（避免 render 阶段 setState-during-render 警告）
  useEffect(() => {
    if (!user || !hasToken) nav('/login', { replace: true, state: { from: loc.pathname } });
    else if (!roles.includes(user.role)) nav('/', { replace: true });
  }, [user, hasToken, roles, nav, loc.pathname]);

  if (!user || !hasToken) return null;
  if (!roles.includes(user.role)) return null;
  return <>{children}</>;
}

function NotFound() {
  return <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-3)', fontFamily: 'var(--font-display)', fontSize: 24 }}>404 · 页面不存在</div>;
}

export default function App() {
  return (
    <ErrBoundary>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<MainLayout />}>
          <Route path="/" element={<Guard roles={['boss','finance','warehouse','sales']}><Dashboard /></Guard>} />
          <Route path="/products" element={<Guard roles={['boss','finance','warehouse','sales']}><Products /></Guard>} />
          <Route path="/products/:id" element={<Guard roles={['boss','finance','warehouse','sales']}><ProductDetail /></Guard>} />
          <Route path="/purchase" element={<Guard roles={['boss','finance','warehouse']}><Purchase /></Guard>} />
          <Route path="/suppliers" element={<Guard roles={['boss','finance','warehouse']}><Suppliers /></Guard>} />
          <Route path="/inventory" element={<Guard roles={['boss','finance','warehouse']}><Inventory /></Guard>} />
          <Route path="/inventory/batch/:id" element={<Guard roles={['boss','finance','warehouse']}><BatchDetail /></Guard>} />
          <Route path="/movements" element={<Guard roles={['boss','finance','warehouse']}><Movements /></Guard>} />
          <Route path="/media" element={<Guard roles={['boss','finance','warehouse']}><Media /></Guard>} />
          <Route path="/sales" element={<Guard roles={['boss','finance','sales']}><Sales /></Guard>} />
          <Route path="/customers" element={<Guard roles={['boss','finance','sales']}><Customers /></Guard>} />
          <Route path="/customers/:id" element={<Guard roles={['boss','finance','sales']}><CustomerDetail /></Guard>} />
          <Route path="/salesman" element={<Guard roles={['boss','finance','sales']}><Salesman /></Guard>} />
          <Route path="/commission" element={<Guard roles={['boss','finance','sales']}><Commission /></Guard>} />
          <Route path="/finance/receive" element={<Guard roles={['boss','finance']}><FinanceReceive /></Guard>} />
          <Route path="/finance/pay" element={<Guard roles={['boss','finance']}><FinancePay /></Guard>} />
          <Route path="/finance/ledger" element={<Guard roles={['boss','finance']}><AccountLedger /></Guard>} />

          <Route path="/settings/users" element={<UserSettings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ErrBoundary>
  );
}
