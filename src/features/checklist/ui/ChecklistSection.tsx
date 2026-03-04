import { useState, useCallback } from 'react';
import { useProductStore } from '@/entities/product';
import { useImageStore } from '@/entities/image';
import { useToastStore } from '@/features/theme';
import { BACKEND_URL } from '@/shared/config/constants';
import {
  analyzeGeneratedImages,
  collectAnalysisData,
  generateChecklistResult,
} from '@/features/checklist';
import type { ChecklistResult } from '@/shared/types';

/**
 * 체크리스트 섹션 컴포넌트
 */
export function ChecklistSection() {
  const {
    generatedSections,
    productName,
    category,
    priceRange,
    targetAudience,
    productFeatures,
    additionalNotes,
  } = useProductStore();
  const { generatedImages, useBackend, geminiApiKey } = useImageStore();
  const showToast = useToastStore((s) => s.showToast);

  const [analyzing, setAnalyzing] = useState(false);
  const [buttonText, setButtonText] = useState('🔍 품질 체크 시작');
  const [result, setResult] = useState<ChecklistResult | null>(null);

  const handleRunChecklist = useCallback(async () => {
    setAnalyzing(true);
    setButtonText('🔍 분석 중...');

    try {
      const analysisData = collectAnalysisData({
        productName,
        category: category || 'other',
        priceRange,
        productFeatures,
        generatedSections,
        generatedImages,
      });

      setButtonText('🔍 이미지 분석 중...');
      const imageAnalysis = await analyzeGeneratedImages(generatedImages, {
        useBackend,
        backendUrl: BACKEND_URL,
        geminiApiKey,
      });
      analysisData.imageAnalysis = imageAnalysis;

      const checklistResult = generateChecklistResult(analysisData);
      setResult(checklistResult);

      showToast('품질 체크가 완료되었습니다!', 'success');
    } catch (error) {
      console.error('Checklist error:', error);
      showToast('분석 중 오류가 발생했습니다.', 'error');
    } finally {
      setAnalyzing(false);
      setButtonText('🔍 품질 체크 시작');
    }
  }, [
    productName,
    category,
    priceRange,
    targetAudience,
    productFeatures,
    additionalNotes,
    generatedSections,
    generatedImages,
    useBackend,
    geminiApiKey,
    showToast,
  ]);

  const scorePercent = result
    ? Math.round((result.totalScore / result.maxScore) * 100)
    : 0;
  const scoreClass =
    scorePercent >= 70
      ? 'bg-accent-success'
      : scorePercent >= 50
        ? 'bg-accent-warning'
        : 'bg-accent-danger';

  return (
    <div className="mt-8 bg-bg-secondary border border-border-subtle rounded-[24px] overflow-hidden">
      <div
        className="p-6 border-b border-border-subtle text-center"
        style={{
          background:
            'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.05))',
        }}
      >
        <h3 className="text-[1.25rem] font-semibold mb-1.5 text-text-primary">
          📋 상세페이지 품질 체크
        </h3>
        <p className="text-[0.875rem] text-text-secondary">
          AI가 상세페이지를 분석하고 개선점을 알려드립니다
        </p>
      </div>

      <div className="p-6">
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={handleRunChecklist}
            disabled={analyzing}
            className="inline-flex items-center gap-3 py-4 px-12 border-none rounded-[16px] text-white font-sans text-base font-semibold cursor-pointer transition-all duration-250 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            style={{ background: 'var(--accent-primary)' }}
          >
            <span>{buttonText}</span>
          </button>
          <p className="text-[0.8rem] text-text-tertiary mt-3">
            생성된 기획서와 이미지를 AI가 분석합니다
          </p>
        </div>
      </div>

      {result && (
        <div className="p-6 border-t border-border-subtle animate-[fadeIn_0.3s_ease]">
          <div className="flex justify-between items-center mb-6">
            <span className="text-[1.1rem] font-semibold text-text-primary flex items-center gap-2">
              📊 분석 결과
              {result.imageAnalyzed ? (
                <span className="text-accent-success text-[0.75rem] ml-2">
                  ✨ AI 이미지 분석 포함
                </span>
              ) : (
                <span className="text-text-tertiary text-[0.75rem] ml-2">
                  📝 텍스트 기반 분석
                </span>
              )}
            </span>
            <div className="flex items-center gap-3">
              <div className="w-[120px] h-2 bg-bg-primary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ease-out ${scoreClass}`}
                  style={{ width: `${scorePercent}%` }}
                />
              </div>
              <span className="font-bold text-base text-text-primary">
                {result.totalScore}/{result.maxScore}
              </span>
            </div>
          </div>

          {result.categories.map((cat, catIdx) => {
            const catPassed = cat.results.filter((r) => r.passed).length;
            return (
              <div key={catIdx} className="mb-5">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border-subtle">
                  <span className="text-[1.1rem]">{cat.icon || '📋'}</span>
                  <span className="font-semibold text-[0.95rem] text-text-primary">
                    {cat.name}
                  </span>
                  <span className="ml-auto text-[0.8rem] text-text-tertiary">
                    {catPassed}/{cat.results.length}
                  </span>
                </div>

                {cat.results.map((item, itemIdx) => (
                  <div key={itemIdx} className="flex items-start gap-2.5 py-2">
                    <span className="w-5 h-5 flex items-center justify-center text-[0.85rem] shrink-0">
                      {item.passed ? '✅' : '❌'}
                    </span>
                    <div className="flex-1">
                      <div className="text-[0.875rem] text-text-primary">
                        {item.label}
                      </div>
                      <div className="text-[0.75rem] text-text-tertiary mt-0.5">
                        {item.detail}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          {result.suggestions.length > 0 && (
            <div
              className="border rounded-[16px] p-4 mt-5"
              style={{
                background:
                  'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
                borderColor: 'rgba(99, 102, 241, 0.2)',
              }}
            >
              <div className="font-semibold text-[0.9rem] mb-3 flex items-center gap-2 text-text-primary">
                💡 개선 제안
              </div>
              {result.suggestions.slice(0, 5).map((suggestion, sIdx) => (
                <div
                  key={sIdx}
                  className="flex items-start gap-2 py-2 text-[0.85rem] text-text-secondary"
                >
                  <span className="shrink-0">💡</span>
                  <span>{suggestion}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
