import { useProductStore } from '@/entities/product';
import { AppLayout } from '@/widgets/header';
import { StepNav } from '@/widgets/step-nav';
import { Step1Page } from '@/pages/step1';
import { Step2Page } from '@/pages/step2';
import { Toast } from '@/shared/ui/components/Toast';

export default function App() {
  const currentStep = useProductStore((s) => s.currentStep);

  return (
    <AppLayout>
      <StepNav />
      {currentStep === 1 && <Step1Page />}
      {currentStep === 2 && <Step2Page />}

      {/* Toasts */}
      <Toast />
    </AppLayout>
  );
}
