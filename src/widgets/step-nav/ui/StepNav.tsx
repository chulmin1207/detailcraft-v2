import { useProductStore } from '@/entities/product';

const STEPS = [
  { step: 1, label: '제품 정보 입력' },
  { step: 2, label: '이미지 생성' },
  { step: 3, label: '상세페이지' },
];

export function StepNav() {
  const { currentStep, goToStep, productName } = useProductStore();

  return (
    <nav className="mb-10 flex justify-center gap-1.5 overflow-x-auto pb-2 sm:gap-2">
      {STEPS.map((item, idx) => {
        const isActive = currentStep === item.step;
        const canClick = item.step === 1 || item.step === 3 || (item.step === 2 && productName.trim().length > 0);

        return (
          <div key={item.step} className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <div
              onClick={() => canClick && goToStep(item.step)}
              className={[
                'flex shrink-0 items-center gap-2 whitespace-nowrap px-3 py-2.5 border rounded-full transition-all duration-200 sm:gap-3 sm:px-6 sm:py-3',
                canClick ? 'cursor-pointer' : 'cursor-default',
                isActive ? 'border-accent-primary bg-[rgba(99,102,241,0.1)]' : 'border-border-subtle',
                !isActive && canClick ? 'hover:border-border-default' : '',
              ].filter(Boolean).join(' ')}
            >
              <div className={[
                'w-6 h-6 rounded-full flex items-center justify-center text-[0.75rem] font-semibold sm:h-7 sm:w-7 sm:text-[0.8rem]',
                isActive ? 'bg-accent-primary text-white' : 'bg-bg-tertiary text-text-primary',
              ].join(' ')}>
                {item.step}
              </div>
              <span className="hidden text-[0.875rem] font-medium text-text-primary sm:inline">{item.label}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className="h-0.5 w-3 shrink-0 self-center bg-border-subtle sm:w-10" />
            )}
          </div>
        );
      })}
    </nav>
  );
}
