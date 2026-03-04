import { useProductStore } from '@/entities/product';

interface Step3ProgressProps {
  visible: boolean;
  title: string;
  completed: number;
  total: number;
  sectionStatuses?: Record<number, string>;
}

/**
 * STEP 3 진행 상황 표시 컴포넌트
 */
export function Step3Progress({
  visible,
  title,
  completed,
  total,
  sectionStatuses = {},
}: Step3ProgressProps) {
  const generatedSections = useProductStore((s) => s.generatedSections);

  if (!visible) return null;

  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const stateText: Record<string, string> = {
    pending: '대기',
    generating: '생성 중...',
    done: '완료 \u2713',
    error: '실패 \u2717',
  };

  const stateClasses: Record<string, string> = {
    pending: 'text-text-tertiary bg-bg-tertiary',
    generating: 'bg-[rgba(139,92,246,0.3)] text-accent-gemini animate-pulse',
    done: 'bg-[rgba(16,185,129,0.3)] text-accent-success',
    error: 'bg-[rgba(239,68,68,0.3)] text-accent-danger',
  };

  return (
    <div className="bg-bg-tertiary border border-accent-gemini rounded-[16px] p-5 mb-6 animate-[fadeIn_0.3s_ease]">
      <div className="flex justify-between items-center mb-3">
        <span className="text-base font-semibold text-text-primary">{title}</span>
        <span className="text-[1.1rem] font-bold text-accent-gemini">
          {completed}/{total}
        </span>
      </div>

      <div className="h-2 bg-bg-primary rounded-full overflow-hidden mb-4">
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-out"
          style={{
            width: `${percent}%`,
            background: 'var(--gradient-gemini)',
          }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {generatedSections.map((section, i) => {
          const status = sectionStatuses[i] || 'pending';
          return (
            <div
              key={i}
              className="flex items-center gap-1.5 py-2 px-3.5 rounded-[10px] text-[0.8rem] font-medium border border-border-subtle bg-bg-primary text-text-tertiary transition-all duration-300"
            >
              <span className="w-5 h-5 flex items-center justify-center bg-bg-tertiary rounded-full text-[0.7rem] font-semibold">
                {section.number}
              </span>
              <span className="text-text-secondary max-w-[100px] overflow-hidden text-ellipsis whitespace-nowrap">
                {section.name}
              </span>
              <span
                className={`text-[0.7rem] py-0.5 px-2 rounded-full ${stateClasses[status] || stateClasses.pending}`}
              >
                {stateText[status] || '대기'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
