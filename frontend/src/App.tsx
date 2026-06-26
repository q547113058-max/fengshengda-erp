import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { lazy, Suspense, Component, ReactNode, useEffect } from 'react';
import { Spin } from 'antd';
import Login from './pages/Login';
import { useAuth, Role } from './store';

// 登录页直接加载；其他页面和布局按需 lazy-load
const MainLayout      = lazy(() => import('./layouts/MainLayout'));
const Dashboard      = lazy(() => import('./pages/Dashboard'));
const Products       = lazy(() => import('./pages/Products'));
const ProductDetail  = lazy(() => import('./pages/ProductDetail'));
const Purchase       = lazy(() => import('./pages/Purchase'));
const Suppliers      = lazy(() => import('./pages/Suppliers'));
const Inventory      = lazy(() => import('./pages/Inventory'));
const BatchDetail    = lazy(() => import('./pages/BatchDetail'));
const Movements      = lazy(() => import('./pages/Movements'));
const Media          = lazy(() => import('./pages/Media'));
const Sales          = lazy(() => import('./pages/Sales'));
const Customers      = lazy(() => import('./pages/Customers'));
const CustomerDetail = lazy(() => import('./pages/CustomerDetail'));
const Salesman       = lazy(() => import('./pages/Salesman'));
const Commission     = lazy(() => import('./pages/Commission'));
const FinanceReceive = lazy(() => import('./pages/FinanceReceive'));
const FinancePay     = lazy(() => import('./pages/FinancePay'));
const AccountLedger  = lazy(() => import('./pages/AccountLedger'));
const UserSettings   = lazy(() => import('./pages/UserSettings'));

function PageLoader() {
  return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
    <Spin size="large" />
  </div>;
}

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

  const hasToken = (() => { try { return !!localStorage.getItem('fsd-token'); } catch { return false; } })();

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
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<MainLayout />}>
            <Route path="/"              element={<Guard roles={['boss','admin','finance','warehouse','sales']}><Dashboard /></Guard>} />
            <Route path="/products"      element={<Guard roles={['boss','admin','finance','warehouse','sales']}><Products /></Guard>} />
            <Route path="/products/:id"  element={<Guard roles={['boss','admin','finance','warehouse','sales']}><ProductDetail /></Guard>} />
            <Route path="/purchase"      element={<Guard roles={['boss','admin','finance','warehouse']}><Purchase /></Guard>} />
            <Route path="/suppliers"     element={<Guard roles={['boss','admin','finance','warehouse']}><Suppliers /></Guard>} />
            <Route path="/inventory"     element={<Guard roles={['boss','admin','finance','warehouse']}><Inventory /></Guard>} />
            <Route path="/inventory/batch/:id" element={<Guard roles={['boss','admin','finance','warehouse']}><BatchDetail /></Guard>} />
            <Route path="/movements"     element={<Guard roles={['boss','admin','finance','warehouse']}><Movements /></Guard>} />
            <Route path="/media"         element={<Guard roles={['boss','admin','finance','warehouse']}><Media /></Guard>} />
            <Route path="/sales"         element={<Guard roles={['boss','admin','finance','sales']}><Sales /></Guard>} />
            <Route path="/customers"     element={<Guard roles={['boss','admin','finance','sales']}><Customers /></Guard>} />
            <Route path="/customers/:id" element={<Guard roles={['boss','admin','finance','sales']}><CustomerDetail /></Guard>} />
            <Route path="/salesman"      element={<Guard roles={['boss','admin','finance','sales']}><Salesman /></Guard>} />
            <Route path="/commission"    element={<Guard roles={['boss','admin','finance','sales']}><Commission /></Guard>} />
            <Route path="/finance/receive" element={<Guard roles={['boss','admin','finance']}><FinanceReceive /></Guard>} />
            <Route path="/finance/pay"     element={<Guard roles={['boss','admin','finance']}><FinancePay /></Guard>} />
            <Route path="/finance/ledger"  element={<Guard roles={['boss','admin','finance']}><AccountLedger /></Guard>} />
            <Route path="/settings/users"  element={<UserSettings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrBoundary>
  );
}
