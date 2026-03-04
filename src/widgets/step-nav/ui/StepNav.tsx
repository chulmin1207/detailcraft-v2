import { useProductStore } from '@/entities/product';
import { useImageStore } from '@/entities/image';

const STEPS = [
  { step: 1, label: '\uC81C\uD488 \uC815\uBCF4 \uC785\uB825' },
  { step: 2, label: 'AI \uAE30\uD68D\uC11C \uC0DD\uC131' },
  { step: 3, label: '\uC774\uBBF8\uC9C0 \uC0DD\uC131' },
];

/**
 * 3단계 스텝 네비게이션 컴포넌트
 */
export function StepNav() {
  const { currentStep, goToStep, canNavigateToStep } = useProductStore();
  const generatedImages = useImageStore((s) => s.generatedImages);

  return (
    <nav className="flex justify-center gap-2 mb-10 max-md:flex-col max-md:items-stretch">
      {STEPS.map((item, idx) => {
        const isActive = currentStep === item.step;
        const isCompleted = canNavigateToStep(item.step + 1, generatedImages);
        const canClick = canNavigateToStep(item.step, generatedImages);

        return (
          <div key={item.step} className="flex items-center gap-2">
            <div
              onClick={() => canClick && goToStep(item.step)}
              className={[
                'flex items-center gap-3 px-6 py-3',
                'bg-bg-secondary border rounded-full',
                'transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
                canClick ? 'cursor-pointer' : 'cursor-default',
                isActive
                  ? 'border-accent-primary bg-[rgba(99,102,241,0.1)]'
                  : isCompleted
                    ? 'border-accent-success'
                    : 'border-border-subtle',
                !isActive && canClick ? 'hover:border-border-default' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div
                className={[
                  'w-7 h-7 rounded-full flex items-center justify-center',
                  'text-[0.8rem] font-semibold text-white',
                  isActive
                    ? 'bg-accent-primary'
                    : isCompleted
                      ? 'bg-accent-success'
                      : 'bg-bg-tertiary text-text-primary',
                ].join(' ')}
              >
                {isCompleted && !isActive ? '\u2713' : item.step}
              </div>

              <span className="text-[0.875rem] font-medium text-text-primary">
                {item.label}
              </span>
            </div>

            {idx < STEPS.length - 1 && (
              <div
                className={[
                  'w-10 h-0.5 self-center max-md:hidden',
                  isCompleted ? 'bg-accent-success' : 'bg-border-subtle',
                ].join(' ')}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
