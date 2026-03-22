import { useState, useCallback, useRef, useEffect } from 'react';
import { useProductStore } from '@/entities/product';
import { useImageStore } from '@/entities/image';
import { useToastStore } from '@/features/theme';
import { MODEL_CONFIG } from '@/shared/config/constants';
import { generateSectionImage, SECTION_DEFAULT_RATIOS } from '@/features/image-generation';
import { UploadZone } from '@/shared/ui/components/UploadZone';
import { BACKEND_URL } from '@/shared/config/constants';
import { CopySuggestModal } from '@/features/plan-generation/ui/CopySuggestModal';
import type { Section, AspectRatio } from '@/shared/types';

const ALL_ASPECT_RATIOS: { value: AspectRatio; label: string; icon: string }[] = [
  { value: 'auto', label: 'Auto', icon: '🔄' },
  { value: '1:1', label: '1:1', icon: '⬜' },
  { value: '3:4', label: '3:4', icon: '▯' },
  { value: '4:3', label: '4:3', icon: '▭' },
  { value: '9:16', label: '9:16', icon: '📱' },
  { value: '16:9', label: '16:9', icon: '🖥' },
  { value: '2:3', label: '2:3', icon: '▯' },
  { value: '3:2', label: '3:2', icon: '▭' },
  { value: '4:5', label: '4:5', icon: '▯' },
  { value: '5:4', label: '5:4', icon: '▭' },
  { value: '21:9', label: '21:9', icon: '🎬' },
  { value: '1:4', label: '1:4', icon: '📜' },
  { value: '4:1', label: '4:1', icon: '🎞' },
  { value: '1:8', label: '1:8', icon: '📏' },
  { value: '8:1', label: '8:1', icon: '🎞' },
];

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
    selectedAspectRatio,
    refStrength,
    useBackend,
    geminiApiKey,
    designBrief,
    imageAnalysis,
    sectionDirectives,
    sectionRefFolders,
    sectionAspectRatios,
    setSectionAspectRatio,
  } = useImageStore();

  const defaultRatio = (section.sectionType && SECTION_DEFAULT_RATIOS[section.sectionType]) || selectedAspectRatio;
  const currentRatio = sectionAspectRatios[index] || defaultRatio;

  const showToast = useToastStore((s) => s.showToast);

  const [expanded, setExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [suggestType, setSuggestType] = useState<'headline' | 'subcopy' | 'visual'>('headline');
  const [showRatioPicker, setShowRatioPicker] = useState(false);
  const ratioPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showRatioPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ratioPickerRef.current && !ratioPickerRef.current.contains(e.target as Node)) {
        setShowRatioPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showRatioPicker]);

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

  const handleSuggestCopy = useCallback((type: 'headline' | 'subcopy' | 'visual') => {
    setSuggestType(type);
    setShowSuggestModal(true);
  }, []);

  // handleApplySuggestion is now handled by CopySuggestModal directly

  const handleGenerateImage = useCallback(async () => {
    if (!useBackend && !geminiApiKey) {
      showToast('Gemini API 키를 설정해주세요.', 'error');
      return;
    }

    setIsGenerating(true);
    showToast(`섹션 ${section.number} 생성 중...`, 'success');

    try {
      const imageData = await generateSectionImage({
        section,
        index,
        modelConfig: MODEL_CONFIG,
        uploadedImages,
        sectionReferences,
        step3Options: null,
        useBackend,
        backendUrl: BACKEND_URL,
        geminiApiKey,
        selectedAspectRatio: currentRatio,
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
        [index]: {
          data: imageData.dataUrl,
          prompt: imageData.prompt,
        },
      }));
      showToast(`섹션 ${section.number} 생성 완료!`, 'success');
    } catch (err) {
      setGeneratedImages((prev) => ({
        ...prev,
        [index]: { data: '', prompt: '', error: err instanceof Error ? err.message : 'Unknown error' },
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
    section,
    index,
    uploadedImages,
    sectionReferences,
    currentRatio,
    productName,
    category,
    productFeatures,
    additionalNotes,
    generatedSections,
    refStrength,
    targetAudience,
    designBrief,
    imageAnalysis,
    sectionDirectives,
    sectionRefFolders,
    setGeneratedImages,
    showToast,
  ]);

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
            {section.sectionType && (
              <span className="text-[0.65rem] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-tertiary border border-border-subtle">
                {section.sectionType}
              </span>
            )}
            <div className="relative" ref={ratioPickerRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRatioPicker((v) => !v);
                }}
                className="text-[0.65rem] px-1.5 py-0.5 rounded bg-accent-primary/10 text-accent-primary border border-accent-primary/30 hover:bg-accent-primary/20 transition-colors cursor-pointer"
                title="화면비 변경"
              >
                &#x1F4D0; {currentRatio}
              </button>
              {showRatioPicker && (
                <div
                  className="absolute top-full left-0 mt-1 z-50 bg-bg-elevated border border-border-default rounded-[10px] shadow-lg p-2 min-w-[200px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-[0.7rem] text-text-tertiary mb-1.5 px-1">
                    화면비 선택
                    {defaultRatio !== currentRatio && (
                      <button
                        onClick={() => {
                          setSectionAspectRatio(index, defaultRatio);
                          setShowRatioPicker(false);
                        }}
                        className="ml-1.5 text-accent-primary hover:underline cursor-pointer bg-transparent border-none p-0 text-[0.65rem]"
                      >
                        (기본값 {defaultRatio})
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {ALL_ASPECT_RATIOS.map((ar) => (
                      <button
                        key={ar.value}
                        onClick={() => {
                          setSectionAspectRatio(index, ar.value);
                          setShowRatioPicker(false);
                        }}
                        className={`
                          px-2 py-1 rounded-md text-[0.7rem] font-medium border transition-all duration-150 cursor-pointer
                          ${currentRatio === ar.value
                            ? 'bg-accent-primary text-white border-accent-primary'
                            : ar.value === defaultRatio
                              ? 'bg-bg-tertiary text-text-primary border-accent-primary/40 hover:border-accent-primary'
                              : 'bg-bg-tertiary text-text-secondary border-border-subtle hover:border-text-tertiary hover:text-text-primary'
                          }
                        `}
                      >
                        {ar.icon} {ar.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
              <div className="flex gap-2 items-start">
                <textarea
                  value={section.visualPrompt || ''}
                  onChange={(e) => updateSection('visualPrompt', e.target.value)}
                  placeholder="추가적인 비주얼 지시가 있다면 입력하세요. 비워두면 레퍼런스 이미지 스타일을 자동으로 분석하여 적용합니다."
                  className="
                    flex-1 py-2.5 px-3.5 bg-bg-tertiary border border-border-subtle rounded-[10px]
                    text-text-primary font-[inherit] text-[0.85rem] min-h-[80px] resize-y
                    transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]
                    focus:outline-none focus:border-accent-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]
                    placeholder:text-text-quaternary
                  "
                />
                <button
                  onClick={() => handleSuggestCopy('visual')}
                  title="AI 비주얼 지시 추천"
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
              <div className="mb-3">
                <label className="text-[0.8rem] font-medium block mb-2 text-text-primary">
                  &#x1F4D0; 화면비
                  {defaultRatio !== currentRatio && (
                    <button
                      onClick={() => setSectionAspectRatio(index, defaultRatio)}
                      className="ml-2 text-[0.7rem] text-text-tertiary hover:text-accent-primary transition-colors"
                    >
                      (기본값 {defaultRatio}로 초기화)
                    </button>
                  )}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_ASPECT_RATIOS.map((ar) => (
                    <button
                      key={ar.value}
                      onClick={() => setSectionAspectRatio(index, ar.value)}
                      className={`
                        px-2.5 py-1.5 rounded-lg text-[0.75rem] font-medium border transition-all duration-150 cursor-pointer
                        ${currentRatio === ar.value
                          ? 'bg-accent-primary text-white border-accent-primary shadow-[0_2px_8px_rgba(99,102,241,0.3)]'
                          : ar.value === defaultRatio
                            ? 'bg-bg-tertiary text-text-primary border-accent-primary/40 hover:border-accent-primary'
                            : 'bg-bg-tertiary text-text-secondary border-border-subtle hover:border-text-tertiary hover:text-text-primary'
                        }
                      `}
                      title={ar.value === defaultRatio ? `기본값 (${section.sectionType || 'global'})` : ''}
                    >
                      {ar.icon} {ar.label}
                    </button>
                  ))}
                </div>
              </div>
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

      <CopySuggestModal
        isOpen={showSuggestModal}
        onClose={() => setShowSuggestModal(false)}
        sectionIndex={index}
        type={suggestType}
      />
    </>
  );
}
