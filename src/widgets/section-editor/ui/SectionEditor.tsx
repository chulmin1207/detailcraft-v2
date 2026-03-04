import { useState, useCallback } from 'react';
import { useProductStore } from '@/entities/product';
import { useImageStore } from '@/entities/image';
import { useToastStore } from '@/features/theme';
import { MODEL_CONFIGS } from '@/shared/config/constants';
import { generateSectionImage } from '@/features/image-generation';
import { UploadZone } from '@/shared/ui/components/UploadZone';
import { ModelSelector } from '@/features/image-generation';
import { BACKEND_URL } from '@/shared/config/constants';
import type { Section, ModelType } from '@/shared/types';

interface SectionEditorProps {
  section: Section;
  index: number;
}

/**
 * 개별 섹션 편집기 컴포넌트 (아코디언)
 */
export function SectionEditor({ section, index }: SectionEditorProps) {
  const {
    generatedSections,
    setGeneratedSections,
    productName,
    category,
    productFeatures,
    additionalNotes,
    targetAudience,
  } = useProductStore();

  const {
    generatedImages,
    setGeneratedImages,
    sectionReferences,
    setSectionReferences,
    uploadedImages,
    selectedModel,
    selectedAspectRatio,
    refStrength,
    useBackend,
    geminiApiKey,
  } = useImageStore();

  const showToast = useToastStore((s) => s.showToast);

  const [expanded, setExpanded] = useState(false);
  const [sectionModel, setSectionModel] = useState<ModelType>(selectedModel);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [suggestType, setSuggestType] = useState<'headline' | 'subcopy'>('headline');

  const hasImage = generatedImages[index] && !generatedImages[index].error;
  const sectionRefs = sectionReferences[index] || [];

  const updateSection = useCallback(
    (field: string, value: string) => {
      setGeneratedSections((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        return next;
      });
    },
    [index, setGeneratedSections],
  );

  const handleAddRef = useCallback(
    (newImages: string[]) => {
      setSectionReferences((prev) => {
        const current = prev[index] || [];
        const remaining = 5 - current.length;
        if (remaining <= 0) {
          showToast('최대 5장까지만 업로드 가능합니다.', 'error');
          return prev;
        }
        return { ...prev, [index]: [...current, ...newImages.slice(0, remaining)] };
      });
    },
    [index, setSectionReferences, showToast],
  );

  const handleRemoveRef = useCallback(
    (imgIndex: number) => {
      setSectionReferences((prev) => {
        const current = [...(prev[index] || [])];
        current.splice(imgIndex, 1);
        return { ...prev, [index]: current };
      });
    },
    [index, setSectionReferences],
  );

  const handleSuggestCopy = useCallback((type: 'headline' | 'subcopy') => {
    setSuggestType(type);
    setShowSuggestModal(true);
  }, []);

  const handleApplySuggestion = useCallback(
    (type: string, value: string) => {
      if (type === 'headline') {
        updateSection('headline', value);
      } else {
        updateSection('subCopy', value);
      }
      setShowSuggestModal(false);
      showToast('카피가 적용되었습니다!', 'success');
    },
    [updateSection, showToast],
  );

  const handleGenerateImage = useCallback(async () => {
    if (!useBackend && !geminiApiKey) {
      showToast('Gemini API 키를 설정해주세요.', 'error');
      return;
    }

    const modelConfig = MODEL_CONFIGS[sectionModel] || MODEL_CONFIGS.fast;
    setIsGenerating(true);
    showToast(`섹션 ${section.number} 생성 중... (${modelConfig.name})`, 'success');

    try {
      const imageData = await generateSectionImage({
        section,
        index,
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
        [index]: {
          data: imageData.dataUrl,
          base64: imageData.base64,
          prompt: imageData.prompt,
        },
      }));
      showToast(`섹션 ${section.number} 생성 완료!`, 'success');
    } catch (err) {
      setGeneratedImages((prev) => ({
        ...prev,
        [index]: { data: '', base64: '', prompt: '', error: err instanceof Error ? err.message : 'Unknown error' },
      }));
      showToast(
        `섹션 ${section.number} 실패: ${err instanceof Error ? err.message : 'Unknown error'}`,
        'error',
      );
    } finally {
      setIsGenerating(false);
    }
  }, [
    useBackend,
    geminiApiKey,
    sectionModel,
    section,
    index,
    uploadedImages,
    sectionReferences,
    selectedAspectRatio,
    productName,
    category,
    productFeatures,
    additionalNotes,
    generatedSections,
    refStrength,
    targetAudience,
    setGeneratedImages,
    showToast,
  ]);

  const alts =
    suggestType === 'headline' ? section.headlineAlts : section.subCopyAlts;
  const hasAlts = alts && alts.length > 0;

  return (
    <>
      <div
        className={`
          bg-bg-tertiary border rounded-[16px] overflow-hidden
          ${hasImage ? 'border-accent-success' : 'border-border-subtle'}
        `}
      >
        <div
          onClick={() => setExpanded(!expanded)}
          className="
            px-[18px] py-[14px] bg-bg-elevated flex justify-between items-center cursor-pointer
            hover:bg-bg-hover transition-colors duration-150
          "
        >
          <div className="font-semibold text-[0.9rem] flex items-center gap-2.5 text-text-primary">
            <span className="w-6 h-6 bg-accent-primary rounded-full flex items-center justify-center text-[0.75rem] text-white">
              {section.number}
            </span>
            {section.name}
            {hasImage && (
              <span className="bg-accent-success text-white text-[0.7rem] px-2 py-0.5 rounded-full ml-2">
                &#x2713; 생성됨
              </span>
            )}
          </div>
          <span
            className={`
              text-[1.25rem] text-text-tertiary transition-transform duration-150
              ${expanded ? 'rotate-180' : ''}
            `}
          >
            &#x25BC;
          </span>
        </div>

        {expanded && (
          <div className="p-[18px] border-t border-border-subtle">
            {hasImage && (
              <div className="mb-4 rounded-[10px] overflow-hidden border-2 border-accent-success">
                <img
                  src={generatedImages[index].data}
                  alt={section.name}
                  className="w-full max-h-[300px] object-contain block bg-bg-primary"
                />
              </div>
            )}

            <div className="mb-4">
              <h4 className="text-[0.85rem] text-text-secondary mb-2 font-medium">
                &#x1F3AF; 목적
              </h4>
              <p className="text-sm leading-relaxed text-text-primary">
                {section.purpose || '(없음)'}
              </p>
            </div>

            <div className="mb-4">
              <h4 className="text-[0.85rem] text-text-secondary mb-2 font-medium">
                &#x1F4DD; 헤드라인
              </h4>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={section.headline || ''}
                  onChange={(e) => updateSection('headline', e.target.value)}
                  placeholder="헤드라인을 입력하세요"
                  className="
                    flex-1 py-2.5 px-3.5 bg-bg-tertiary border border-border-subtle rounded-[10px]
                    text-text-primary font-[inherit] text-sm
                    transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]
                    focus:outline-none focus:border-accent-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]
                    placeholder:text-text-quaternary
                  "
                />
                <button
                  onClick={() => handleSuggestCopy('headline')}
                  title="AI 카피 추천"
                  className="
                    py-2.5 px-3.5 border-none rounded-[10px] text-white text-base cursor-pointer
                    flex-shrink-0 transition-all duration-150
                    hover:scale-105 hover:shadow-[0_4px_15px_rgba(99,102,241,0.4)]
                  "
                  style={{
                    background:
                      'linear-gradient(135deg, var(--accent-primary), var(--accent-gemini))',
                  }}
                >
                  &#x2728;
                </button>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="text-[0.85rem] text-text-secondary mb-2 font-medium">
                &#x1F4AC; 서브카피
              </h4>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={section.subCopy || ''}
                  onChange={(e) => updateSection('subCopy', e.target.value)}
                  placeholder="서브카피를 입력하세요"
                  className="
                    flex-1 py-2.5 px-3.5 bg-bg-tertiary border border-border-subtle rounded-[10px]
                    text-text-primary font-[inherit] text-sm
                    transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]
                    focus:outline-none focus:border-accent-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]
                    placeholder:text-text-quaternary
                  "
                />
                <button
                  onClick={() => handleSuggestCopy('subcopy')}
                  title="AI 카피 추천"
                  className="
                    py-2.5 px-3.5 border-none rounded-[10px] text-white text-base cursor-pointer
                    flex-shrink-0 transition-all duration-150
                    hover:scale-105 hover:shadow-[0_4px_15px_rgba(99,102,241,0.4)]
                  "
                  style={{
                    background:
                      'linear-gradient(135deg, var(--accent-primary), var(--accent-gemini))',
                  }}
                >
                  &#x2728;
                </button>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="text-[0.85rem] text-text-secondary mb-2 font-medium">
                &#x1F3A8; 비주얼 지시 (선택사항 - 레퍼런스 이미지 우선 적용)
              </h4>
              <textarea
                value={section.visualPrompt || ''}
                onChange={(e) => updateSection('visualPrompt', e.target.value)}
                placeholder="추가적인 비주얼 지시가 있다면 입력하세요. 비워두면 레퍼런스 이미지 스타일을 자동으로 분석하여 적용합니다."
                className="
                  w-full py-2.5 px-3.5 bg-bg-tertiary border border-border-subtle rounded-[10px]
                  text-text-primary font-[inherit] text-[0.85rem] min-h-[80px] resize-y
                  transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]
                  focus:outline-none focus:border-accent-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]
                  placeholder:text-text-quaternary
                "
              />
            </div>

            <div className="mt-4">
              <label className="text-[0.8rem] font-medium block mb-2 text-text-primary">
                &#x1F5BC;&#xFE0F; 섹션 전용 레퍼런스 (최대 5장) - 스타일 참고용
              </label>
              <UploadZone
                icon="&#x2795;"
                text="클릭하거나 드래그하여 이미지 추가"
                hint=""
                images={sectionRefs}
                onAdd={handleAddRef}
                onRemove={handleRemoveRef}
                maxCount={5}
              />
            </div>

            <div className="mt-4 pt-4 border-t border-border-subtle">
              <ModelSelector
                selectedModel={sectionModel}
                onModelChange={setSectionModel}
                compact
              />
              <button
                onClick={handleGenerateImage}
                disabled={isGenerating || (!useBackend && !geminiApiKey)}
                className={`
                  w-full py-3 px-4 border-none rounded-[10px] text-white font-semibold text-[0.9rem]
                  cursor-pointer flex items-center justify-center gap-2
                  transition-all duration-250 ease-[cubic-bezier(0.4,0,0.2,1)]
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                  hover:enabled:-translate-y-0.5
                `}
                style={{
                  background: 'var(--gradient-gemini)',
                  boxShadow: 'var(--shadow-gemini)',
                }}
              >
                {isGenerating ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>&#x1F34C; 이미지 생성</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {showSuggestModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-[8px] z-[1001] flex items-center justify-center animate-[fadeIn_0.2s_ease]"
          onClick={() => setShowSuggestModal(false)}
        >
          <div
            className="bg-bg-secondary border border-border-subtle rounded-[24px] w-full max-w-[500px] mx-5 overflow-hidden animate-[modalIn_0.3s_ease]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 px-5 border-b border-border-subtle flex justify-between items-center">
              <span className="font-semibold flex items-center gap-2 text-text-primary">
                &#x2728;{' '}
                {suggestType === 'headline' ? '헤드라인' : '서브카피'} 대안
              </span>
              <button
                onClick={() => setShowSuggestModal(false)}
                className="bg-transparent border-none text-text-tertiary text-2xl cursor-pointer p-0 leading-none hover:text-text-primary"
              >
                &times;
              </button>
            </div>

            <div className="p-3 max-h-[400px] overflow-y-auto">
              {hasAlts ? (
                alts.map((copy, i) => (
                  <div
                    key={i}
                    onClick={() => handleApplySuggestion(suggestType, copy)}
                    className="
                      p-3 mb-2 bg-bg-tertiary rounded-[10px] cursor-pointer
                      border border-transparent
                      hover:border-accent-gemini hover:bg-[rgba(139,92,246,0.1)]
                      transition-all duration-150
                    "
                  >
                    <span className="text-sm text-text-primary">{copy}</span>
                  </div>
                ))
              ) : (
                <div className="p-[30px] text-center text-text-secondary">
                  <p>&#x1F4A1; 저장된 대안이 없습니다.</p>
                  <p className="text-[0.8rem] text-text-tertiary mt-1">
                    기획서를 다시 생성하면 대안 카피가 포함됩니다.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 px-5 border-t border-border-subtle bg-bg-tertiary text-center">
              <p className="text-[0.8rem] text-text-tertiary mb-2">
                마음에 드는 게 없나요?
              </p>
              <button
                onClick={() => setShowSuggestModal(false)}
                className="
                  px-4 py-2 rounded-[10px] text-sm font-medium cursor-pointer
                  bg-bg-elevated text-text-primary border border-border-default
                  hover:bg-bg-hover hover:border-border-strong
                  transition-all duration-150
                "
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
