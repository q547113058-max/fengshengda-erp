import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api } from '@/api/client';

export type Role = 'boss' | 'admin' | 'finance' | 'warehouse' | 'sales';

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: Role;
  status: string;
  default_commission_rate: number;
  phone: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  /** localStorage 持久化数据是否已 hydrate 完成（首次 load 时为 false） */
  _hydrated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  setHydrated: (v: boolean) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      loading: false,
      error: null,
      _hydrated: false,
      login: async (username, password) => {
        set({ loading: true, error: null });
        try {
          const { access_token, user } = await api.login(username, password);
          // 存 token 到 localStorage（API client 自动读）
          try { localStorage.setItem('fsd-token', access_token); } catch { /* ignore */ }
          set({ user, loading: false });
          return true;
        } catch (e: any) {
          set({ error: e?.message || '登录失败', loading: false });
          return false;
        }
      },
      logout: () => {
        try { localStorage.removeItem('fsd-token'); } catch { /* ignore */ }
        set({ user: null });
      },
      setHydrated: (v) => set({ _hydrated: v }),
    }),
    {
      name: 'fsd-auth',
      version: 2,
      migrate: (persisted: any, version: number) => {
        // version < 2 的旧数据没有 full_name，直接清空让用户重新登录
        if (version < 2) return { user: null };
        return persisted;
      },
      storage: createJSONStorage(() => localStorage),
      // 只持久化 user，不持久化 _hydrated/loading/error 等瞬时状态
      partialize: (s) => ({ user: s.user } as any),
      onRehydrateStorage: () => (state) => {
        // hydration 完成回调
        state?.setHydrated(true);
      },
    },
  ),
);
