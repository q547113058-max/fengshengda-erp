import { ReactNode } from 'react';
import { useAuth } from '@/store';

/**
 * 等 zustand persist 从 localStorage 完成 hydrate 后再渲染 children。
 * 避免首屏因 user=null 误判跳 /login。
 */
export function PersistGate({ children }: { children: ReactNode }) {
  const hydrated = useAuth((s) => s._hydrated);
  if (!hydrated) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--paper, #faf8f5)',
        color: 'var(--ink-3, #6e7569)',
        fontFamily: '"DM Sans", -apple-system, "PingFang SC", sans-serif',
        fontSize: 14,
      }}>
        正在恢复登录状态…
      </div>
    );
  }
  return <>{children}</>;
}
