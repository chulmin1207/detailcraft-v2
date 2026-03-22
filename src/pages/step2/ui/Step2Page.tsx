import { useState, useCallback } from 'react';
import { useProductStore } from '@/entities/product';
import { useImageStore } from '@/entities/image';
import { useToastStore } from '@/features/theme';
import { generateSectionImage, Step3Progress } from '@/features/image-generation';
import { MODEL_CONFIG, BACKEND_URL } from '@/shared/config/constants';
import { PlanDisplay, SectionList } from '@/widgets/section-editor';
import { BatchGenerate } from '@/features/image-generation';
import { ProgressBar } from '@/shared/ui/components/ProgressBar';

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
    selectedAspectRatio,
    uploadedImages,
    sectionReferences,
    sectionAspectRatios,
    refStrength,
    useBackend,
    geminiApiKey,
    designBrief,
    imageAnalysis,
    sectionDirectives,
    sectionRefFolders,
  } = useImageStore();

  const showToast = useToastStore((s) => s.showToast);

  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchLogs, setBatchLogs] = useState<LogEntry[]>([]);
  const [sectionStatuses, setSectionStatuses] = useState<Record<number, string>>({});

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

    setIsBatchGenerating(true);
    setBatchProgress(0);
    setBatchLogs([]);

    const totalLength = generatedSections.length;

    // 섹션별 상태 초기화
    const initialStatuses: Record<number, string> = {};
    for (let i = 0; i < totalLength; i++) {
      initialStatuses[i] = 'pending';
    }
    setSectionStatuses(initialStatuses);

    const addLog = (message: string, type = 'info') => {
      const timestamp = new Date().toLocaleTimeString();
      setBatchLogs((prev) => [...prev, { message: `[${timestamp}] ${message}`, type }]);
    };

    addLog('전체 이미지 생성 시작', 'info');

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < totalLength; i++) {
      const section = generatedSections[i];
      setSectionStatuses((prev) => ({ ...prev, [i]: 'generating' }));
      addLog(`섹션 ${section.number}: ${section.name} 생성 중...`, 'info');

      try {
        const imageData = await generateSectionImage({
          section,
          index: i,
          modelConfig: MODEL_CONFIG,
          uploadedImages,
          sectionReferences,
          step3Options: null,
          useBackend,
          backendUrl: BACKEND_URL,
          geminiApiKey,
          selectedAspectRatio: sectionAspectRatios[i] || selectedAspectRatio,
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
          designBrief,
          imageAnalysis,
          sectionDirectives,
          sectionRefFolders,
        });

        setGeneratedImages((prev) => ({
          ...prev,
          [i]: { data: imageData.dataUrl, prompt: imageData.prompt },
        }));

        addLog(`섹션 ${section.number} 생성 완료!`, 'success');
        successCount++;
        setSectionStatuses((prev) => ({ ...prev, [i]: 'done' }));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '알 수 없는 오류';
        setGeneratedImages((prev) => ({
          ...prev,
          [i]: { data: '', prompt: '', error: message },
        }));
        addLog(`섹션 ${section.number} 실패: ${message}`, 'error');
        errorCount++;
        setSectionStatuses((prev) => ({ ...prev, [i]: 'error' }));
      }

      setBatchProgress(Math.round(((i + 1) / totalLength) * 100));
    }

    const total = totalLength;
    if (errorCount === 0) {
      addLog(`전체 이미지 생성 완료! (${successCount}/${total} 성공)`, 'success');
      showToast(`전체 이미지 생성 완료! (${successCount}개 성공)`, 'success');
    } else {
      addLog(`생성 완료: ${successCount}개 성공, ${errorCount}개 실패`, 'error');
      showToast(`생성 완료: ${successCount}/${total} 성공, ${errorCount}개 실패`, 'error');
    }
    setIsBatchGenerating(false);
  }, [
    useBackend, geminiApiKey, generatedSections,
    uploadedImages, sectionReferences, selectedAspectRatio, sectionAspectRatios,
    productName, category, productFeatures, additionalNotes,
    refStrength, targetAudience, designBrief, imageAnalysis,
    sectionDirectives, sectionRefFolders, setGeneratedImages, showToast,
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
          onGenerateAll={handleGenerateAll}
          isGenerating={isBatchGenerating}
          disabled={!useBackend && !geminiApiKey}
          totalSections={totalSections}
        />

        {/* Step 3 이동 버튼 */}
        <button
          type="button"
          onClick={handleGoToStep3}
          disabled={completedSections === 0}
          className={`
            py-4 px-8 rounded-[10px] text-base font-medium border-none
            transition-all duration-150
            ${completedSections === 0
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-60'
              : 'bg-accent-primary text-white cursor-pointer hover:bg-accent-primary-hover'}
          `}
        >
          &#x1F4E5; 다운로드 페이지로 이동 &#x2192;
          {completedSections > 0 && (
            <span className="text-[0.8rem] opacity-80 ml-1">
              ({completedSections}개 완료)
            </span>
          )}
        </button>
      </div>

      {/* 배치 생성 진행 상황 */}
      {isBatchGenerating && (
        <>
          <Step3Progress
            visible={true}
            title={`이미지 생성 중... ${batchProgress}%`}
            completed={Object.values(sectionStatuses).filter((s) => s === 'done' || s === 'error').length}
            total={generatedSections.length}
            sectionStatuses={sectionStatuses}
          />
          <ProgressBar
            percent={batchProgress}
            variant="gemini"
            label="이미지를 생성하고 있습니다..."
            showLog
            logs={batchLogs}
          />
        </>
      )}
    </section>
  );
}
