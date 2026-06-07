import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api } from '@/api/client';

export type Role = 'boss' | 'finance' | 'warehouse' | 'sales';

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
          const user = await api.login(username, password);
          set({ user, loading: false });
          return true;
        } catch (e: any) {
          set({ error: e?.message || '登录失败', loading: false });
          return false;
        }
      },
      logout: () => set({ user: null }),
      setHydrated: (v) => set({ _hydrated: v }),
    }),
    {
      name: 'fsd-auth',
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
