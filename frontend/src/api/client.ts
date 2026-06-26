// 前端 API client — Vite 代理 /api → http://localhost:3003

const BASE = '/api';

export interface ApiError {
  statusCode: number;
  message: string | string[];
}

// 从 localStorage 读 token（如果存在）
function getAuthToken(): string | null {
  try {
    return localStorage.getItem('fsd-token');
  } catch {
    return null;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  // 未来后端加 JWT 时，前端自动带上
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(BASE + path, { ...init, headers });
  if (res.status === 401) {
    // 401 未授权 → 清 token + 清 zustand store，彻底注销
    try { localStorage.removeItem('fsd-token'); } catch { /* ignore */ }
    try { localStorage.removeItem('fsd-auth'); } catch { /* ignore */ }
    // 动态 import 避免循环依赖，只在 401 时才加载 store
    try { const { useAuth } = await import('@/store'); useAuth.getState().logout(); } catch { /* ignore */ }
  }
  if (!res.ok) {
    let body: any = null;
    try { body = await res.json(); } catch { /* ignore */ }
    const message = (Array.isArray(body?.message) ? body.message.join('; ') : body?.message) || res.statusText;
    throw Object.assign(new Error(message), { status: res.status, body });
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<any>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  // Generic CRUD helpers
  list:  <T>(path: string) => request<T[]>(`/${path}`),
  one:   <T>(path: string, id: number | string) => request<T>(`/${path}/${id}`),
  create: <T>(path: string, body: any) => request<T>(`/${path}`, { method: 'POST', body: JSON.stringify(body) }),
  update: <T>(path: string, id: number | string, body: any) => request<T>(`/${path}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (path: string, id: number | string) => request<any>(`/${path}/${id}`, { method: 'DELETE' }),

  // Domain-specific shortcuts
  products:        () => request<any[]>('/products'),
  suppliers:       () => request<any[]>('/suppliers'),
  purchaseOrders:  () => request<any[]>('/purchase'),
  inventoryBatches:() => request<any[]>('/inventory/batches'),
  inventoryAgg:    () => request<any[]>('/inventory/aggregated'),
  movements:       (type?: string) => request<any[]>(type ? `/movements?type=${type}` : '/movements'),
  media:           (productId?: number) => request<any[]>(productId ? `/media?product_id=${productId}` : '/media'),
  customers:       () => request<any[]>('/customers'),
  salesOrders:     () => request<any[]>('/sales'),
  commissions:     (status?: string) => request<any[]>(status ? `/commission?status=${status}` : '/commission'),
  accounts:        () => request<any[]>('/finance/accounts'),
  transactions:    (direction?: 'in' | 'out') =>
                     request<any[]>(direction ? `/finance/transactions?direction=${direction}` : '/finance/transactions'),
  dashboardKpi:    () => request<any>('/dashboard/kpi'),
  users:           () => request<any[]>('/users'),

  // 业务动作
  payPurchase:    (id: number, body: any) => request<any>(`/purchase/${id}/pay`,    { method: 'POST', body: JSON.stringify(body) }),
  receiveSale:    (id: number, body: any) => request<any>(`/sales/${id}/receive`,    { method: 'POST', body: JSON.stringify(body) }),
  settleCommission:(id: number, body: any) => request<any>(`/commission/${id}/settle`,{ method: 'POST', body: JSON.stringify(body) }),
  addMovement:    (body: any)             => request<any>(`/inventory/movement`,     { method: 'POST', body: JSON.stringify(body) }),

  // 文件上传（不走 /api 前缀，Vite proxy 不加 api）
  uploadFile: async (file: File, opts?: { product_id?: number; batch_id?: number; type?: 'image'|'video'; uploader_id?: number; remark?: string }) => {
    const fd = new FormData();
    fd.append('file', file);
    if (opts?.product_id) fd.append('product_id', String(opts.product_id));
    if (opts?.batch_id) fd.append('batch_id', String(opts.batch_id));
    if (opts?.type) fd.append('type', opts.type);
    if (opts?.uploader_id) fd.append('uploader_id', String(opts.uploader_id));
    if (opts?.remark) fd.append('remark', opts.remark);
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    // FormData 不要手动设 Content-Type，浏览器自动加 boundary
    const res = await fetch('/api/media/upload', { method: 'POST', body: fd, headers });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return res.json();
  },
};
