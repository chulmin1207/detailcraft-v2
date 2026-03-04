import { useState, useCallback } from 'react';
import { useProductStore } from '@/entities/product';
import { useImageStore } from '@/entities/image';
import { useToastStore } from '@/features/theme';
import { generateSectionImage } from '@/features/image-generation';
import { MODEL_CONFIGS, BACKEND_URL } from '@/shared/config/constants';
import { PlanDisplay, SectionList } from '@/widgets/section-editor';
import { BatchGenerate } from '@/features/image-generation';
import { ProgressBar } from '@/shared/ui/components/ProgressBar';
// ModelType is used indirectly through store types

interface LogEntry {
  message: string;
  type: string;
}

/**
 * STEP 2 페이지 컴포넌트
 * 기획서 표시 + 섹션 편집 + 일괄 이미지 생성
 */
export function Step2Page() {
  const {
    generatedSections,
    productName,
    category,
    productFeatures,
    additionalNotes,
    targetAudience,
    goToStep,
  } = useProductStore();

  const {
    generatedImages,
    setGeneratedImages,
    selectedModel,
    setSelectedModel,
    selectedAspectRatio,
    setAspectRatio,
    uploadedImages,
    sectionReferences,
    refStrength,
    useBackend,
    geminiApiKey,
  } = useImageStore();

  const showToast = useToastStore((s) => s.showToast);

  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchLogs, setBatchLogs] = useState<LogEntry[]>([]);

  // 완료된 섹션 수 계산
  const totalSections = generatedSections.length;
  const completedSections = Object.values(generatedImages).filter(
    (img) => img && !img.error,
  ).length;

  // 전체 이미지 일괄 생성
  const handleGenerateAll = useCallback(async () => {
    if (!useBackend && !geminiApiKey) {
      showToast('Gemini API 키를 설정해주세요.', 'error');
      return;
    }

    if (generatedSections.length === 0) {
      showToast('생성된 섹션이 없습니다.', 'error');
      return;
    }

    const modelConfig = MODEL_CONFIGS[selectedModel] || MODEL_CONFIGS.fast;

    setIsBatchGenerating(true);
    setBatchProgress(0);
    setBatchLogs([]);

    const addLog = (message: string, type = 'info') => {
      const timestamp = new Date().toLocaleTimeString();
      setBatchLogs((prev) => [...prev, { message: `[${timestamp}] ${message}`, type }]);
    };

    addLog(`전체 이미지 생성 시작 (${modelConfig.name})`, 'info');

    for (let i = 0; i < generatedSections.length; i++) {
      const section = generatedSections[i];
      addLog(`섹션 ${section.number}: ${section.name} 생성 중...`, 'info');

      try {
        const imageData = await generateSectionImage({
          section,
          index: i,
          modelConfig,
          uploadedImages,
          sectionReferences,
          step3Options: null,
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
          headline: section.headline,
          subCopy: section.subCopy,
          userVisualPrompt: section.visualPrompt,
          targetAudience,
        });

        setGeneratedImages((prev) => ({
          ...prev,
          [i]: { data: imageData.dataUrl, base64: imageData.base64, prompt: imageData.prompt },
        }));

        addLog(`섹션 ${section.number} 생성 완료!`, 'success');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '알 수 없는 오류';
        setGeneratedImages((prev) => ({
          ...prev,
          [i]: { error: message } as { data: string; base64: string; prompt: string; error: string },
        }));
        addLog(`섹션 ${section.number} 실패: ${message}`, 'error');
      }

      setBatchProgress(Math.round(((i + 1) / generatedSections.length) * 100));
    }

    addLog('전체 이미지 생성 완료!', 'success');
    setIsBatchGenerating(false);
    showToast('전체 이미지 생성이 완료되었습니다!', 'success');
  }, [
    useBackend, geminiApiKey, generatedSections, selectedModel,
    uploadedImages, sectionReferences, selectedAspectRatio,
    productName, category, productFeatures, additionalNotes,
    refStrength, targetAudience, setGeneratedImages, showToast,
  ]);

  // Step 3 이동
  const handleGoToStep3 = useCallback(() => {
    if (completedSections === 0) {
      showToast('최소 1개 섹션의 이미지를 생성해주세요.', 'error');
      return;
    }
    goToStep(3);
  }, [completedSections, goToStep, showToast]);

  return (
    <section>
      {/* 기획서 표시 */}
      <PlanDisplay />

      {/* 섹션별 편집기 */}
      <SectionList />

      {/* 생성 현황 */}
      <div className="text-center">
        <div className="bg-bg-tertiary border border-border-subtle rounded-[16px] p-5 mb-5 text-center">
          <div className="flex justify-center items-center gap-3 mb-2">
            <span className="text-[0.9rem] text-text-secondary">
              &#x1F4CA; 생성 현황
            </span>
            <span className="text-[1.25rem] font-bold text-accent-gemini">
              {completedSections}/{totalSections} 섹션 완료
            </span>
          </div>
          <p className="text-[0.8rem] text-text-tertiary">
            각 섹션의 &quot;&#x1F34C; 이미지 생성&quot; 버튼을 눌러 원하는 섹션만 생성하세요.
          </p>
        </div>

        {/* 전체 일괄 생성 */}
        <BatchGenerate
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          selectedRatio={selectedAspectRatio}
          onRatioChange={setAspectRatio}
          onGenerateAll={handleGenerateAll}
          isGenerating={isBatchGenerating}
          disabled={!useBackend && !geminiApiKey}
        />

        {/* Step 3 이동 버튼 */}
        <button
          type="button"
          onClick={handleGoToStep3}
          className="
            py-4 px-8 rounded-[10px] text-base font-medium cursor-pointer
            bg-accent-primary text-white border-none
            hover:bg-accent-primary-hover
            transition-all duration-150
          "
        >
          &#x1F4E5; 다운로드 페이지로 이동 &#x2192;
          {completedSections > 0 && (
            <span className="text-[0.8rem] opacity-80 ml-1">
              ({completedSections}개 완료)
            </span>
          )}
        </button>
      </div>

      {/* 배치 생성 진행 바 */}
      {isBatchGenerating && (
        <ProgressBar
          percent={batchProgress}
          variant="gemini"
          label="이미지를 생성하고 있습니다..."
          showLog
          logs={batchLogs}
        />
      )}
    </section>
  );
}
