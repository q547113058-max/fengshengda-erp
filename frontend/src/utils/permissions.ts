// 权限矩阵 — 可编辑, 持久化到 localStorage
// 'e' = 编辑, 'v' = 查看, undefined = 无权限

export type PermLevel = 'e' | 'v' | undefined;
export type RolePerms = Record<string, PermLevel>;
export type PermMatrix = Record<string, RolePerms>;

const STORAGE_KEY = 'fsd-perms';
const MODULE_KEYS = ['products','purchase','suppliers','inventory','sales','customers','finance'] as const;

const DEFAULTS: PermMatrix = {
  boss:      { products:'e', purchase:'e', suppliers:'e', inventory:'e', sales:'e', customers:'e', finance:'e' },
  finance:   { products:'v', purchase:'v', suppliers:'v', inventory:'v', sales:'v', customers:'v', finance:'e' },
  warehouse: { products:'v', purchase:'v', suppliers:'v', inventory:'e' },
  sales:     { products:'v', sales:'e', customers:'e' },
};

export function loadMatrix(): PermMatrix {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PermMatrix;
  } catch { /* ignore */ }
  return { ...DEFAULTS };
}

export function saveMatrix(m: PermMatrix) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(m)); } catch { /* ignore */ }
}

export function resetMatrix() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

export function getDefaults(): PermMatrix {
  return { ...DEFAULTS };
}

// 检查某角色对某模块是否有编辑权限
export function canEdit(role: string, module: string): boolean {
  const m = loadMatrix();
  return m[role]?.[module] === 'e';
}

// 检查某角色对某模块是否有查看权限（至少查看）
export function canView(role: string, module: string): boolean {
  const m = loadMatrix();
  const p = m[role]?.[module];
  return p === 'e' || p === 'v';
}

// 获取某角色有权限的模块 key 列表（至少查看）
export function visibleModules(role: string): string[] {
  const m = loadMatrix();
  const perms = m[role] || {};
  return MODULE_KEYS.filter(k => perms[k] === 'e' || perms[k] === 'v');
}
