import { useProductStore } from '@/entities/product';

const STEPS = [
  { step: 1, label: '제품 정보 입력' },
  { step: 2, label: '이미지 생성' },
];

export function StepNav() {
  const { currentStep, goToStep, productName } = useProductStore();

  return (
    <nav className="flex justify-center gap-2 mb-10">
      {STEPS.map((item, idx) => {
        const isActive = currentStep === item.step;
        const canClick = item.step === 1 || (item.step === 2 && productName.trim().length > 0);

        return (
          <div key={item.step} className="flex items-center gap-2">
            <div
              onClick={() => canClick && goToStep(item.step)}
              className={[
                'flex items-center gap-3 px-6 py-3 border rounded-full transition-all duration-200',
                canClick ? 'cursor-pointer' : 'cursor-default',
                isActive ? 'border-accent-primary bg-[rgba(99,102,241,0.1)]' : 'border-border-subtle',
                !isActive && canClick ? 'hover:border-border-default' : '',
              ].filter(Boolean).join(' ')}
            >
              <div className={[
                'w-7 h-7 rounded-full flex items-center justify-center text-[0.8rem] font-semibold',
                isActive ? 'bg-accent-primary text-white' : 'bg-bg-tertiary text-text-primary',
              ].join(' ')}>
                {item.step}
              </div>
              <span className="text-[0.875rem] font-medium text-text-primary">{item.label}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className="w-10 h-0.5 self-center bg-border-subtle" />
            )}
          </div>
        );
      })}
    </nav>
  );
}
