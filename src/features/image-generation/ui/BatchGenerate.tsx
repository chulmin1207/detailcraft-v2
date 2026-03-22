interface BatchGenerateProps {
  onGenerateAll: () => void;
  isGenerating?: boolean;
  disabled?: boolean;
  totalSections?: number;
}

/**
 * 전체 이미지 일괄 생성 컴포넌트
 */
export function BatchGenerate({
  onGenerateAll,
  isGenerating = false,
  disabled = false,
  totalSections = 0,
}: BatchGenerateProps) {
  return (
    <div className="mb-5">
      <div className="bg-bg-tertiary border border-border-subtle rounded-[16px] p-5">
        <p className="text-[0.8rem] text-accent-warning mb-4 p-2.5 bg-[rgba(245,158,11,0.1)] rounded-[6px]">
          &#x26A0;&#xFE0F; {totalSections}개 섹션을 연속 생성합니다. 각 섹션에 설정된 비율로 생성됩니다.
        </p>

        <button
          onClick={onGenerateAll}
          disabled={disabled || isGenerating}
          className={`
            inline-flex items-center gap-3 py-4 px-12
            border-none rounded-[16px] text-white font-semibold text-base
            cursor-pointer
            transition-all duration-250 ease-[cubic-bezier(0.4,0,0.2,1)]
            disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
            hover:enabled:-translate-y-0.5 hover:enabled:shadow-[0_0_60px_rgba(99,102,241,0.5)]
            w-full justify-center
          `}
          style={{
            background: 'var(--gradient-gemini)',
            boxShadow: 'var(--shadow-gemini)',
          }}
        >
          {isGenerating ? (
            <>
              <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              생성 중...
            </>
          ) : (
            <span>&#x26A1; 전체 이미지 생성</span>
          )}
        </button>

        {!isGenerating && totalSections > 0 && (
          <p className="text-xs text-text-tertiary mt-2">
            예상 소요 시간: 약 {Math.ceil(totalSections * 0.3)}분
          </p>
        )}

        {disabled && (
          <p className="text-xs text-accent-danger mt-1">
            Gemini API 키를 설정해주세요
          </p>
        )}

        {totalSections > 10 && !isGenerating && (
          <p className="text-xs text-accent-warning mt-1">
            섹션이 {totalSections}개로 많아 생성 시간이 오래 걸릴 수 있습니다
          </p>
        )}
      </div>
    </div>
  );
}
