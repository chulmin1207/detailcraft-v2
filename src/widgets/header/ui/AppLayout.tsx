import type { ReactNode } from 'react';
import { Header } from './Header';
import { BgEffects } from '@/shared/ui/components/BgEffects';
import { Toast } from '@/shared/ui/components/Toast';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <BgEffects />
      <Header />
      <main className="max-w-[1200px] mx-auto px-8 py-8 relative z-[1]">
        {children}
      </main>
      <Toast />
    </div>
  );
}
