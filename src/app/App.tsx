import { useState, useEffect } from 'react';
import { Providers } from './providers';
import { useProductStore } from '@/entities/product';
import { useAuthStore } from '@/features/auth';
import { ApiKeyModal } from '@/features/auth';
import { AppLayout } from '@/widgets/header';
import { StepNav } from '@/widgets/step-nav';
import { Step1Page } from '@/pages/step1';
import { Step2Page } from '@/pages/step2';
import { Step3Page } from '@/pages/step3';
import { ErrorBoundary } from '@/shared/ui';

function AppContent() {
  const currentStep = useProductStore((s) => s.currentStep);
  const { checkAuth } = useAuthStore();

  const [showApiModal, setShowApiModal] = useState(false);

  // 초기화: 인증 확인
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <AppLayout onOpenApiSettings={() => setShowApiModal(true)}>
      {/* 스텝 네비게이션 */}
      <StepNav />

      {/* 스텝별 컨텐츠 */}
      <ErrorBoundary>
        {currentStep === 1 && <Step1Page />}
        {currentStep === 2 && <Step2Page />}
        {currentStep === 3 && <Step3Page />}
      </ErrorBoundary>

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
