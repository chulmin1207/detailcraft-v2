import { useState, useCallback } from 'react';
import { useProductStore } from '@/entities/product';
import { useImageStore } from '@/entities/image';
import { useToastStore } from '@/features/theme';
import { generateSectionImage, Step3Progress } from '@/features/image-generation';
import { MODEL_CONFIGS, BACKEND_URL } from '@/shared/config/constants';
import { ImageGrid } from '@/widgets/image-grid';
import { DownloadSection } from '@/features/download';
import { ChecklistSection } from '@/features/checklist';
import type { ModelType } from '@/shared/types';

/**
 * STEP 3 페이지 컴포넌트
 * 이미지 그리드 + 재생성 + 다운로드 + 체크리스트
 */
export function Step3Page() {
  const {
    generatedSections,
    productName,
    category,
    productFeatures,
    additionalNotes,
    targetAudience,
  } = useProductStore();

  const {
    generatedImages,
    setGeneratedImages,
    uploadedImages,
    sectionReferences,
    step3References,
    step3Prompts,
    step3Models,
    step3IncludeOptions,
    selectedModel,
    selectedAspectRatio,
    refStrength,
    useBackend,
    geminiApiKey,
    designBrief,
  } = useImageStore();

  const showToast = useToastStore((s) => s.showToast);

  // ===== 진행 상황 상태 =====
  const [progressVisible, setProgressVisible] = useState(false);
  const [progressTitle, setProgressTitle] = useState('');
  const [progressCompleted, setProgressCompleted] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [sectionStatuses, setSectionStatuses] = useState<Record<number, string>>({});
  const [isRegeneratingAll, setIsRegeneratingAll] = useState(false);

  // 성공 이미지 수
  const successCount = Object.values(generatedImages).filter(
    (img) => img && !img.error,
  ).length;

  // ===== 모델 설정 가져오기 =====
  const getModelConfig = useCallback(
    (index: number) => {
      const model: ModelType = step3Models[index] || selectedModel;
      return MODEL_CONFIGS[model] || MODEL_CONFIGS.fast;
    },
    [step3Models, selectedModel],
  );

  // ===== sleep 유틸리티 =====
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // ===== 공통 이미지 생성 파라미터 빌드 =====
  const buildGenerateParams = useCallback(
    (section: (typeof generatedSections)[number], index: number, modelConfig: (typeof MODEL_CONFIGS)[ModelType], step3Options: Record<string, unknown> | null = null) => ({
      section,
      index,
      modelConfig,
      uploadedImages,
      sectionReferences,
      step3Options,
      useBackend,
      backendUrl: BACKEND_URL,
      geminiApiKey,
      selectedAspectRatio,
      productName,
      category: category || 'snack',
      productFeatures,
      additionalNotes,
      generatedSections,
      refStrength,
      targetAudience,
      designBrief,
    }),
    [
      uploadedImages, sectionReferences, useBackend, geminiApiKey,
      selectedAspectRatio, productName, category, productFeatures,
      additionalNotes, generatedSections, refStrength, targetAudience, designBrief,
    ],
  );

  // ===== 단일 섹션 재생성 (랜덤 또는 옵션 포함) =====
  const handleRegenerate = useCallback(
    async (index: number, { withOptions }: { withOptions: boolean }) => {
      if (!useBackend && !geminiApiKey) {
        showToast('Gemini API 키를 설정해주세요.', 'error');
        return;
      }

      const section = generatedSections[index];
      const modelConfig = getModelConfig(index);

      // step3Options 구성 (withOptions가 true일 때만)
      let step3Options: Record<string, unknown> | null = null;
      if (withOptions) {
        const opts = step3IncludeOptions[index] || {};
        step3Options = {
          includeGenerated: opts.includeGenerated !== undefined ? opts.includeGenerated : !!(generatedImages[index] && !generatedImages[index].error),
          includeStep1Ref: opts.includeStep1Ref || false,
          includeReference: opts.includeReference || false,
          includePrompt: opts.includePrompt !== undefined ? opts.includePrompt : true,
          step3Refs: step3References[index] || [],
          step3Prompt: step3Prompts[index] || '',
          generatedImages,
        };
      }

      showToast(`섹션 ${section.number} 재생성 중...`, 'success');

      try {
        const params = buildGenerateParams(section, index, modelConfig, step3Options);
        const imageData = await generateSectionImage(params);

        setGeneratedImages((prev) => ({
          ...prev,
          [index]: {
            data: imageData.dataUrl,
            base64: imageData.base64,
            prompt: imageData.prompt,
          },
        }));

        showToast(`섹션 ${section.number} 재생성 완료!`, 'success');
      } catch (err: unknown) {
        console.error('Regeneration error:', err);
        const message = err instanceof Error ? err.message : '알 수 없는 오류';
        setGeneratedImages((prev) => ({
          ...prev,
          [index]: { error: message } as { data: string; base64: string; prompt: string; error: string },
        }));
        showToast(`섹션 ${section.number} 재생성 실패: ${message}`, 'error');
      }
    },
    [
      useBackend, geminiApiKey, generatedSections, generatedImages,
      getModelConfig, step3IncludeOptions, step3References, step3Prompts,
      buildGenerateParams, setGeneratedImages, showToast,
    ],
  );

  // ===== 전체 재생성 =====
  const regenerateAllImagesInStep3 = useCallback(async () => {
    if (!useBackend && !geminiApiKey) {
      showToast('Gemini API 키를 설정해주세요.', 'error');
      return;
    }

    const total = generatedSections.length;
    if (total === 0) return;

    setIsRegeneratingAll(true);
    setProgressVisible(true);
    setProgressTotal(total);
    setProgressCompleted(0);
    setProgressTitle('🍌 이미지 생성 중...');

    // 섹션별 상태 초기화
    const initialStatuses: Record<number, string> = {};
    for (let i = 0; i < total; i++) {
      initialStatuses[i] = 'pending';
    }
    setSectionStatuses(initialStatuses);

    let completed = 0;
    let errors = 0;

    try {
      for (let i = 0; i < total; i++) {
        const section = generatedSections[i];
        const modelConfig = getModelConfig(i);

        // 현재 섹션 생성 중 표시
        setSectionStatuses((prev) => ({ ...prev, [i]: 'generating' }));
        setProgressTitle(`🍌 섹션 ${section.number}: ${section.name} 생성 중...`);

        try {
          const params = buildGenerateParams(section, i, modelConfig);
          const imageData = await generateSectionImage(params);

          setGeneratedImages((prev) => ({
            ...prev,
            [i]: {
              data: imageData.dataUrl,
              base64: imageData.base64,
              prompt: imageData.prompt,
            },
          }));

          setSectionStatuses((prev) => ({ ...prev, [i]: 'done' }));
          completed++;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : '알 수 없는 오류';
          setGeneratedImages((prev) => ({
            ...prev,
            [i]: { error: message } as { data: string; base64: string; prompt: string; error: string },
          }));
          setSectionStatuses((prev) => ({ ...prev, [i]: 'error' }));
          errors++;
        }

        // 진행률 업데이트
        setProgressCompleted(i + 1);

        // Rate limiting
        if (i < total - 1) {
          await sleep(500);
        }
      }

      // 완료 메시지
      setProgressTitle(`✅ 완료! ${completed}개 성공, ${errors}개 실패`);
      showToast(
        `전체 재생성 완료! (${completed}/${total} 성공)`,
        completed === total ? 'success' : 'error',
      );
    } catch (error: unknown) {
      console.error('Error:', error);
      const message = error instanceof Error ? error.message : '알 수 없는 오류';
      showToast(`오류: ${message}`, 'error');
      setProgressTitle(`❌ 오류 발생: ${message}`);
    } finally {
      setIsRegeneratingAll(false);

      // 5초 후 진행 상황 UI 숨기기
      setTimeout(() => {
        setProgressVisible(false);
      }, 5000);
    }
  }, [
    useBackend, geminiApiKey, generatedSections,
    getModelConfig, buildGenerateParams,
    setGeneratedImages, showToast,
  ]);

  return (
    <section>
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-5 flex-wrap gap-4">
        <h2 className="font-display text-[1.5rem] font-semibold text-text-primary flex items-center gap-3">
          🎨 생성된 이미지
          <span className="py-1 px-3 bg-[rgba(16,185,129,0.1)] text-accent-success rounded-full text-[0.75rem]">
            {successCount}/{generatedSections.length}
          </span>
        </h2>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={regenerateAllImagesInStep3}
            disabled={isRegeneratingAll}
            className="py-2 px-4 text-[0.875rem] font-medium rounded-[10px] border border-border-subtle bg-bg-secondary text-text-secondary cursor-pointer transition-all duration-150 hover:bg-bg-hover hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRegeneratingAll ? '⏳ 재생성 중...' : '🔄 전체 재생성'}
          </button>
        </div>
      </div>

      {/* 진행 상황 (일괄 재생성 중) */}
      <Step3Progress
        visible={progressVisible}
        title={progressTitle}
        completed={progressCompleted}
        total={progressTotal}
        sectionStatuses={sectionStatuses}
      />

      {/* 이미지 그리드 */}
      <ImageGrid onRegenerate={handleRegenerate} />

      {/* 다운로드 섹션 */}
      <DownloadSection />

      {/* 체크리스트 섹션 */}
      <ChecklistSection />
    </section>
  );
}
