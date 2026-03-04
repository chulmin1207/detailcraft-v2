import { useState, useEffect } from 'react';
import { Providers } from './providers';
import { useProductStore } from '@/entities/product';
import { useAuthStore } from '@/features/auth';
import { LoginScreen, ApiKeyModal } from '@/features/auth';
import { AppLayout } from '@/widgets/header';
import { StepNav } from '@/widgets/step-nav';
import { Step1Page } from '@/pages/step1';
import { Step2Page } from '@/pages/step2';
import { Step3Page } from '@/pages/step3';

function AppContent() {
  const currentStep = useProductStore((s) => s.currentStep);
  const { currentUser, authLoading, checkAuth } = useAuthStore();

  const [showApiModal, setShowApiModal] = useState(false);

  // 초기화: 인증 확인
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // 로딩 중
  if (authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg-primary)' }}
      >
        <div className="w-10 h-10 border-3 border-[rgba(99,102,241,0.3)] border-t-accent-primary rounded-full animate-spin" />
      </div>
    );
  }

  // 로그인 필요
  if (!currentUser) {
    return <LoginScreen />;
  }

  return (
    <AppLayout onOpenApiSettings={() => setShowApiModal(true)}>
      {/* 스텝 네비게이션 */}
      <StepNav />

      {/* 스텝별 컨텐츠 */}
      {currentStep === 1 && <Step1Page />}
      {currentStep === 2 && <Step2Page />}
      {currentStep === 3 && <Step3Page />}

      {/* API 키 설정 모달 */}
      <ApiKeyModal isOpen={showApiModal} onClose={() => setShowApiModal(false)} />
    </AppLayout>
  );
}

export function App() {
  return (
    <Providers>
      <AppContent />
    </Providers>
  );
}
