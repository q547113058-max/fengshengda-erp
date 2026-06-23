import { Card, Table, Tag, Button, Tabs, App, Space } from 'antd';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import EditModal, { FieldDef } from '@/components/EditModal';
import { useAuth } from '@/store';
import { loadMatrix, saveMatrix, resetMatrix, getDefaults, PermMatrix, PermLevel } from '@/utils/permissions';

const ROLE_LABEL: Record<string, string> = { boss: '老板', admin: '管理员', finance: '财务', warehouse: '仓储', sales: '销售' };
const ROLE_COLOR: Record<string, string> = { boss: 'gold', admin: 'orange', finance: 'blue', warehouse: 'green', sales: 'default' };
const ROLES = ['boss', 'admin', 'finance', 'warehouse', 'sales'];

const MODULES = [
  { key: 'products',  label: '产品' },
  { key: 'purchase',  label: '采购' },
  { key: 'suppliers', label: '供应商' },
  { key: 'inventory', label: '库存' },
  { key: 'sales',     label: '销售' },
  { key: 'customers', label: '客户' },
  { key: 'finance',   label: '财务' },
];

const PERM_LABEL: Record<string, { text: string; color: string }> = {
  e: { text: '编辑', color: 'var(--moss)' },
  v: { text: '查看', color: 'var(--copper)' },
};

export default function UserSettings() {
  const { message } = App.useApp();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = useAuth(s => s.user);
  const isBoss = currentUser?.role === 'boss';
  const isAdmin = currentUser?.role === 'admin';
  const canManage = isBoss || isAdmin;
  const nav = useNavigate();

  const reload = () => {
    setLoading(true);
    api.users().then(setUsers).finally(() => setLoading(false));
  };

  useEffect(reload, []);

  // 非 boss：自动打开自己资料弹窗，隐藏页面内容
  useEffect(() => {
    if (!isBoss && users.length > 0 && currentUser) {
      const me = users.find(u => u.id === currentUser.id);
      if (me) { setEditing(me); setModalOpen(true); }
    }
  }, [isBoss, users, currentUser]);

  // ?editSelf=true 时自动打开当前用户编辑弹窗（仅 boss 有侧边菜单入口）
  useEffect(() => {
    if (searchParams.get('editSelf') === 'true' && users.length > 0 && currentUser) {
      const me = users.find(u => u.id === currentUser.id);
      if (me) {
        setEditing(me);
        setModalOpen(true);
      }
      setSearchParams({}, { replace: true });
    }
  }, [users, searchParams, currentUser, setSearchParams]);

  // 个人资料字段（自己改）
  const selfFields: FieldDef[] = [
    { name: 'full_name', label: '姓名', required: true },
    { name: 'phone', label: '电话' },
    { name: 'old_password', label: '旧密码（改密时填）', type: 'password', placeholder: '不改密请留空' },
    { name: 'new_password', label: '新密码', type: 'password', placeholder: '不改密请留空' },
  ];

  // boss/admin 管理字段（改别人）
  const bossAdminFields: FieldDef[] = [
    { name: 'full_name', label: '姓名', required: true },
    { name: 'phone', label: '电话' },
    { name: 'role', label: '角色', type: 'select', options: [
      { value: 'boss', label: '老板' }, { value: 'admin', label: '管理员' },
      { value: 'finance', label: '财务' },
      { value: 'warehouse', label: '仓储' }, { value: 'sales', label: '销售' },
    ]},
    { name: 'default_commission_rate', label: '默认佣金(%)', type: 'number', min: 0, step: 0.5 },
    { name: 'status', label: '状态', type: 'select', options: [
      { value: 'active', label: '正常' }, { value: 'disabled', label: '停用' },
    ]},
    { name: 'new_password', label: '重置密码', type: 'password', placeholder: '不改请留空' },
  ];

  // 判断点的是不是自己
  const isSelf = editing && currentUser && editing.id === currentUser.id;
  const isEditingBoss = editing?.role === 'boss';
  // admin 不能改老板
  const canEditTarget = isBoss || (isAdmin && !isEditingBoss);
  const fields = isSelf ? selfFields : (canEditTarget ? bossAdminFields : selfFields);

  const [createOpen, setCreateOpen] = useState(false);

  // 权限矩阵 — 可编辑
  const [matrix, setMatrix] = useState<PermMatrix>(loadMatrix);
  const [matrixDirty, setMatrixDirty] = useState(false);

  const togglePerm = useCallback((role: string, mod: string) => {
    setMatrix(prev => {
      const next = { ...prev };
      const rolePerms = { ...(next[role] || {}) };
      const cur = rolePerms[mod];
      // 循环: undefined → 'v' → 'e' → undefined
      if (!cur) rolePerms[mod] = 'v';
      else if (cur === 'v') rolePerms[mod] = 'e';
      else delete rolePerms[mod];
      next[role] = rolePerms;
      return next;
    });
    setMatrixDirty(true);
  }, []);

  const handleSaveMatrix = () => {
    saveMatrix(matrix);
    setMatrixDirty(false);
    message.success('权限已保存，用户重新登录后生效');
  };

  const handleResetMatrix = () => {
    resetMatrix();
    setMatrix(getDefaults());
    setMatrixDirty(false);
    message.success('已恢复默认权限');
  };

  // 新增用户字段
  const createFields: FieldDef[] = [
    { name: 'username', label: '工号', required: true, placeholder: '登录账号，如 sales03' },
    { name: 'password', label: '初始密码', required: true, type: 'password', placeholder: '首次登录密码' },
    { name: 'full_name', label: '姓名', required: true },
    { name: 'role', label: '角色', type: 'select', required: true, options: [
      ...(isBoss ? [{ value: 'admin', label: '管理员' }] : []),
      { value: 'finance', label: '财务' },
      { value: 'warehouse', label: '仓储' },
      { value: 'sales', label: '销售' },
    ]},
    { name: 'phone', label: '电话' },
    { name: 'default_commission_rate', label: '默认佣金(%)', type: 'number', min: 0, step: 0.5 },
  ];

  if (!canManage) {
    // 非 boss：只显示个人资料弹窗
    return (
      <EditModal
        open={modalOpen}
        title="个人资料"
        fields={selfFields}
        initial={editing || {}}
        onCancel={() => { setModalOpen(false); setEditing(null); nav('/'); }}
        onSubmit={async (v) => {
          if (!v.new_password) delete v.new_password;
          if (!v.old_password) delete v.old_password;
          await api.update('users', editing.id, v);
          if (currentUser) {
            const { useAuth } = await import('@/store');
            useAuth.setState({ user: { ...currentUser, ...v, password: undefined, new_password: undefined, old_password: undefined } });
          }
          setModalOpen(false);
          setEditing(null);
        }}
      />
    );
  }

  return (
    <Card title="用户与权限" extra={<Button type="primary" onClick={() => setCreateOpen(true)}>+ 新增用户</Button>}>
      <Tabs
        items={[
          {
            key: 'list', label: '用户列表',
            children: (
              <>
                <Table
                  size="small"
                  loading={loading}
                  rowKey="id"
                  dataSource={users}
                  pagination={false}
                  columns={[
                    { title: '工号', dataIndex: 'username', render: (v: string) => <span style={{ fontFamily: 'var(--font-mono)' }}>{v}</span> },
                    { title: '姓名', dataIndex: 'full_name', render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span> },
                    { title: '角色', dataIndex: 'role', width: 100, render: (v: string) => <Tag color={ROLE_COLOR[v]}>{ROLE_LABEL[v]}</Tag> },
                    { title: '电话', dataIndex: 'phone', width: 140, render: (s: string) => <span style={{ fontFamily: 'var(--font-mono)' }}>{s || '—'}</span> },
                    { title: '默认佣金', dataIndex: 'default_commission_rate', width: 100, align: 'right' as const, render: (v: number) => v ? `${v}%` : '—' },
                    { title: '状态', dataIndex: 'status', width: 90, render: (v: string) => <Tag color={v === 'active' ? 'success' : 'default'}>{v === 'active' ? '正常' : v}</Tag> },
                    {
                      title: '操作', width: 110, align: 'right' as const,
                      render: (_: any, r: any) => {
                        // admin 不能编辑老板
                        if (isAdmin && r.role === 'boss') return <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>—</span>;
                        return (
                          <Button size="small" onClick={() => { setEditing(r); setModalOpen(true); }}>
                            {currentUser?.id === r.id ? '我的资料' : '编辑'}
                          </Button>
                        );
                      },
                    },
                  ]}
                />
                <EditModal
                  open={modalOpen}
                  title={isSelf ? '个人资料' : `编辑用户 · ${editing?.full_name || ''}`}
                  fields={fields}
                  initial={editing || {}}
                  onCancel={() => { setModalOpen(false); setEditing(null); nav('/'); }}
                  onSubmit={async (v) => {
                    if (!v.new_password) delete v.new_password;
                    if (!v.old_password) delete v.old_password;
                    await api.update('users', editing.id, v);
                    if (isSelf && currentUser) {
                      const { useAuth } = await import('@/store');
                      useAuth.setState({ user: { ...currentUser, ...v, password: undefined, new_password: undefined, old_password: undefined } });
                    }
                    reload();
                  }}
                />
                <EditModal
                  open={createOpen}
                  title="新增用户"
                  fields={createFields}
                  onCancel={() => setCreateOpen(false)}
                  onSubmit={async (v) => {
                    await api.create('users', v);
                    message.success('用户已创建');
                    setCreateOpen(false);
                    reload();
                  }}
                />
              </>
            ),
          },
          {
            key: 'matrix', label: '权限矩阵',
            children: (
              <>
                <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-ink-3" style={{ fontSize: 12 }}>点击单元格切换：编辑 → 查看 → 关闭</span>
                  <Space>
                    <Button size="small" onClick={handleResetMatrix}>恢复默认</Button>
                    <Button size="small" type="primary" disabled={!matrixDirty} onClick={handleSaveMatrix}>保存权限</Button>
                  </Space>
                </div>
                <Table
                  size="small"
                  rowKey="role"
                  dataSource={ROLES.map(role => ({ role, mods: matrix[role] || {} }))}
                  pagination={false}
                  columns={[
                    { title: '角色', dataIndex: 'role', width: 120, render: (v: string) => <Tag color={ROLE_COLOR[v]}>{ROLE_LABEL[v]}</Tag> },
                    ...MODULES.map(m => ({
                      title: m.label, key: m.key, align: 'center' as const, width: 90,
                      render: (_: any, r: any) => {
                        const p: PermLevel = r.mods[m.key];
                        const info = PERM_LABEL[p as string];
                        // boss 行不允许任何人改；admin 行只允许 boss 改
                        const locked = r.role === 'boss' || (r.role === 'admin' && !isBoss);
                        return (
                          <span
                            onClick={() => { if (!locked) togglePerm(r.role, m.key); }}
                            style={{
                              cursor: locked ? 'default' : 'pointer',
                              color: info?.color || 'var(--ink-3)',
                              fontWeight: info ? 500 : undefined,
                              padding: '2px 8px',
                              borderRadius: 4,
                              display: 'inline-block',
                              userSelect: 'none',
                            }}
                          >
                            {info ? info.text : '—'}
                          </span>
                        );
                      },
                    })),
                  ]}
                />
              </>
            ),
          },
        ]}
      />
    </Card>
  );
}
