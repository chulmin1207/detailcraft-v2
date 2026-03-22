import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useProductStore } from '@/entities/product';
import { useImageStore } from '@/entities/image';
import { useToastStore } from '@/features/theme';
import { useImageUpload } from '@/shared/hooks/useImageUpload';
import { UploadZone } from '@/shared/ui/components/UploadZone';
import { CopySuggestModal } from '@/features/plan-generation/ui/CopySuggestModal';
import { SECTION_DEFAULT_RATIOS } from '@/features/image-generation';
import type { AspectRatio } from '@/shared/types';

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

interface RegenPanelProps {
  index: number;
  onRegenerate: (index: number, options: { withOptions: boolean }) => void;
}

/**
 * 재생성 옵션 모달 (섹션 편집 + 재생성 통합)
 */
export function RegenPanel({ index, onRegenerate }: RegenPanelProps) {
  const {
    generatedSections,
    setGeneratedSections,
  } = useProductStore();

  const {
    step3References,
    setStep3References,
    step3Prompts,
    setStep3Prompts,
    step3IncludeOptions,
    setStep3IncludeOptions,
    uploadedImages,
    generatedImages,
    sectionReferences,
    setSectionReferences,
    selectedAspectRatio,
    sectionAspectRatios,
    setSectionAspectRatio,
  } = useImageStore();
  const showToast = useToastStore((s) => s.showToast);

  const [isOpen, setIsOpen] = useState(false);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [suggestType, setSuggestType] = useState<'headline' | 'subcopy' | 'visual'>('headline');

  const section = generatedSections[index];
  if (!section) return null;

  const hasImage = generatedImages[index] && !generatedImages[index].error;
  const step1RefCount = uploadedImages.references.length;
  const sectionPrompt = step3Prompts[index] || '';
  const sectionRefs = sectionReferences[index] || [];

  const defaultRatio = (section?.sectionType && SECTION_DEFAULT_RATIOS[section.sectionType]) || selectedAspectRatio;
  const currentRatio = sectionAspectRatios[index] || defaultRatio;

  const opts = step3IncludeOptions[index] || {};
  const chkGenerated =
    opts.includeGenerated !== undefined ? opts.includeGenerated : hasImage;
  const chkStep1Ref =
    opts.includeStep1Ref !== undefined ? opts.includeStep1Ref : false;
  const chkReference =
    opts.includeReference !== undefined ? opts.includeReference : false;
  const chkPrompt =
    opts.includePrompt !== undefined ? opts.includePrompt : true;

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

  const handleSuggestCopy = useCallback((type: 'headline' | 'subcopy' | 'visual') => {
    setSuggestType(type);
    setShowSuggestModal(true);
  }, []);

  const saveIncludeOption = useCallback(
    (type: string, value: boolean) => {
      setStep3IncludeOptions((prev) => ({
        ...prev,
        [index]: { ...(prev[index] || {}), [type]: value },
      }));
    },
    [index, setStep3IncludeOptions],
  );

  const handlePromptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setStep3Prompts((prev) => ({ ...prev, [index]: e.target.value }));
    },
    [index, setStep3Prompts],
  );

  const handleRefImagesChange = useCallback(
    (newImages: string[]) => {
      setStep3References((prev) => ({ ...prev, [index]: newImages }));
    },
    [index, setStep3References],
  );

  const handleAddSectionRef = useCallback(
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

  const handleRemoveSectionRef = useCallback(
    (imgIndex: number) => {
      setSectionReferences((prev) => {
        const current = [...(prev[index] || [])];
        current.splice(imgIndex, 1);
        return { ...prev, [index]: current };
      });
    },
    [index, setSectionReferences],
  );

  const {
    images: refImages,
    isFocused,
    isDragOver,
    fileInputRef,
    zoneRef,
    handleClick,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileChange,
    removeImage: removeRefImage,
    replaceImages,
  } = useImageUpload({
    maxCount: 5,
    onImagesChange: handleRefImagesChange,
    onError: (msg: string) => showToast(msg, 'error'),
  });

  useEffect(() => {
    const saved = step3References[index];
    if (saved && saved.length > 0 && refImages.length === 0) {
      replaceImages(saved);
    }
  }, [index, step3References]);

  const handleGenerate = useCallback(() => {
    onRegenerate(index, { withOptions: true });
    setIsOpen(false);
  }, [index, onRegenerate]);

  const uploadZoneClasses = [
    'border-2 border-dashed rounded-[10px] p-3 text-center cursor-pointer text-xs transition-all duration-150 relative',
    isDragOver
      ? 'border-accent-gemini bg-[rgba(139,92,246,0.1)]'
      : isFocused
        ? 'border-[3px] border-dashed border-transparent shadow-[0_0_15px_rgba(139,92,246,0.3)] animate-pulse'
        : 'border-border-default text-text-tertiary hover:border-accent-gemini hover:text-text-secondary',
  ].join(' ');

  const uploadZoneStyle: React.CSSProperties = isFocused
    ? {
        background:
          'linear-gradient(var(--bg-tertiary), var(--bg-tertiary)) padding-box, linear-gradient(90deg, var(--accent-primary), var(--accent-gemini), var(--accent-secondary), var(--accent-primary)) border-box',
        backgroundSize: '100% 100%, 200% 100%',
        borderColor: 'transparent',
      }
    : {};

  const inputClassName = `
    flex-1 py-2 px-3 bg-bg-tertiary border border-border-subtle rounded-[10px]
    text-text-primary font-[inherit] text-sm
    transition-all duration-150
    focus:outline-none focus:border-accent-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]
    placeholder:text-text-quaternary
  `;

  const suggestBtnClassName = `
    py-2 px-3 border-none rounded-[10px] text-white text-sm cursor-pointer
    flex-shrink-0 transition-all duration-150
    hover:scale-105 hover:shadow-[0_4px_15px_rgba(99,102,241,0.4)]
  `;

  const suggestBtnStyle = {
    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-gemini))',
  };

  const checkboxLabel = (active: boolean, disabled = false) =>
    [
      'flex items-center gap-2 py-2 px-3 border rounded-[6px] transition-all duration-150',
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      active && !disabled
        ? 'border-accent-gemini bg-[rgba(139,92,246,0.1)]'
        : 'bg-bg-primary border-border-subtle hover:border-border-strong',
    ].join(' ');

  return (
    <>
      <div className="border-t border-border-subtle">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full px-4 py-2.5 flex justify-between items-center cursor-pointer text-[0.8rem] text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-all duration-150"
        >
          <span>🎨 섹션 편집 & 재생성</span>
          <span className="text-[0.7rem] text-text-tertiary">클릭하여 열기 →</span>
        </button>
      </div>

      {isOpen && createPortal(
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-[8px] z-[1000] flex items-center justify-center"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-bg-secondary border border-border-subtle rounded-[24px] w-full max-w-[640px] mx-5 overflow-hidden animate-[modalIn_0.3s_ease] flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-border-subtle flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 bg-accent-primary rounded-full flex items-center justify-center text-[0.8rem] text-white font-semibold">
                  {section.number}
                </span>
                <div>
                  <h3 className="text-[1rem] font-semibold text-text-primary leading-tight">
                    {section.name}
                  </h3>
                  {section.sectionType && (
                    <span className="text-[0.65rem] text-text-tertiary">{section.sectionType}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 bg-bg-tertiary border-none rounded-[10px] text-text-secondary text-xl cursor-pointer flex items-center justify-center hover:bg-bg-hover hover:text-text-primary transition-all duration-150"
              >
                &times;
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto flex-1 p-6">
              {/* 현재 이미지 미리보기 */}
              {hasImage && (
                <div className="mb-5 rounded-[10px] overflow-hidden border-2 border-accent-success">
                  <img
                    src={generatedImages[index].data}
                    alt={section.name}
                    className="w-full max-h-[250px] object-contain block bg-bg-primary"
                  />
                </div>
              )}

              {/* ===== 섹션 편집 영역 ===== */}
              <div className="mb-5">
                <h4 className="text-[0.8rem] font-semibold text-text-primary mb-3 flex items-center gap-1.5">
                  <span className="w-5 h-5 bg-accent-primary/10 text-accent-primary rounded flex items-center justify-center text-[0.7rem]">✏️</span>
                  섹션 내용 편집
                </h4>

                {/* 목적 (읽기 전용) */}
                {section.purpose && (
                  <div className="mb-3">
                    <label className="block text-[0.75rem] font-medium mb-1 text-text-secondary">🎯 목적</label>
                    <p className="text-[0.8rem] text-text-tertiary leading-relaxed bg-bg-tertiary rounded-[8px] px-3 py-2">
                      {section.purpose}
                    </p>
                  </div>
                )}

                {/* 헤드라인 */}
                <div className="mb-3">
                  <label className="block text-[0.75rem] font-medium mb-1 text-text-secondary">📝 헤드라인</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={section.headline || ''}
                      onChange={(e) => updateSection('headline', e.target.value)}
                      placeholder="헤드라인을 입력하세요"
                      className={inputClassName}
                    />
                    <button
                      onClick={() => handleSuggestCopy('headline')}
                      title="AI 카피 추천"
                      className={suggestBtnClassName}
                      style={suggestBtnStyle}
                    >
                      ✨
                    </button>
                  </div>
                </div>

                {/* 서브카피 */}
                <div className="mb-3">
                  <label className="block text-[0.75rem] font-medium mb-1 text-text-secondary">💬 서브카피</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={section.subCopy || ''}
                      onChange={(e) => updateSection('subCopy', e.target.value)}
                      placeholder="서브카피를 입력하세요"
                      className={inputClassName}
                    />
                    <button
                      onClick={() => handleSuggestCopy('subcopy')}
                      title="AI 카피 추천"
                      className={suggestBtnClassName}
                      style={suggestBtnStyle}
                    >
                      ✨
                    </button>
                  </div>
                </div>

                {/* 비주얼 지시 */}
                <div className="mb-3">
                  <label className="block text-[0.75rem] font-medium mb-1 text-text-secondary">🎨 비주얼 지시</label>
                  <div className="flex gap-2 items-start">
                    <textarea
                      value={section.visualPrompt || ''}
                      onChange={(e) => updateSection('visualPrompt', e.target.value)}
                      placeholder="비주얼 지시를 입력하세요"
                      className={`${inputClassName} min-h-[70px] resize-y text-[0.85rem]`}
                    />
                    <button
                      onClick={() => handleSuggestCopy('visual')}
                      title="AI 비주얼 지시 추천"
                      className={suggestBtnClassName}
                      style={suggestBtnStyle}
                    >
                      ✨
                    </button>
                  </div>
                </div>

                {/* 섹션 전용 레퍼런스 */}
                <div className="mb-3">
                  <label className="block text-[0.75rem] font-medium mb-1 text-text-secondary">
                    🖼️ 섹션 전용 레퍼런스 (최대 5장)
                  </label>
                  <UploadZone
                    icon="➕"
                    text="클릭하거나 드래그하여 이미지 추가"
                    hint=""
                    images={sectionRefs}
                    onAdd={handleAddSectionRef}
                    onRemove={handleRemoveSectionRef}
                    maxCount={5}
                  />
                </div>

                {/* 화면비 */}
                <div>
                  <label className="block text-[0.75rem] font-medium mb-1.5 text-text-secondary">
                    📐 화면비
                    {defaultRatio !== currentRatio && (
                      <button
                        onClick={() => setSectionAspectRatio(index, defaultRatio)}
                        className="ml-2 text-[0.65rem] text-accent-primary hover:underline cursor-pointer bg-transparent border-none p-0"
                      >
                        (기본값 {defaultRatio}로 초기화)
                      </button>
                    )}
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {ALL_ASPECT_RATIOS.map((ar) => (
                      <button
                        key={ar.value}
                        onClick={() => setSectionAspectRatio(index, ar.value)}
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
              </div>

              {/* 구분선 */}
              <div className="border-t border-border-subtle my-5" />

              {/* ===== 재생성 옵션 영역 ===== */}
              <div>
                <h4 className="text-[0.8rem] font-semibold text-text-primary mb-3 flex items-center gap-1.5">
                  <span className="w-5 h-5 bg-accent-gemini/10 text-accent-gemini rounded flex items-center justify-center text-[0.7rem]">🔄</span>
                  재생성 옵션
                </h4>

                {/* 포함 요소 체크박스 */}
                <div className="mb-3">
                  <label className="block text-[0.75rem] font-medium mb-1.5 text-text-secondary">
                    🎯 재생성에 포함할 요소
                  </label>
                  <div className="flex flex-col gap-1.5">
                    <label className={checkboxLabel(chkGenerated && hasImage, !hasImage)}>
                      <input
                        type="checkbox"
                        checked={chkGenerated}
                        disabled={!hasImage}
                        onChange={(e) => saveIncludeOption('includeGenerated', e.target.checked)}
                        className="w-4 h-4 accent-accent-gemini cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <span className={`text-[0.8rem] ${chkGenerated && hasImage ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                        🖼️ 기존 생성 이미지
                      </span>
                    </label>

                    <label className={checkboxLabel(chkStep1Ref && step1RefCount > 0, step1RefCount === 0)}>
                      <input
                        type="checkbox"
                        checked={chkStep1Ref}
                        disabled={step1RefCount === 0}
                        onChange={(e) => saveIncludeOption('includeStep1Ref', e.target.checked)}
                        className="w-4 h-4 accent-accent-gemini cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <span className={`text-[0.8rem] ${chkStep1Ref && step1RefCount > 0 ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                        🎨 STEP 1 전체 레퍼런스 ({step1RefCount}장)
                      </span>
                    </label>

                    <label className={checkboxLabel(chkReference)}>
                      <input
                        type="checkbox"
                        checked={chkReference}
                        onChange={(e) => saveIncludeOption('includeReference', e.target.checked)}
                        className="w-4 h-4 accent-accent-gemini cursor-pointer"
                      />
                      <span className={`text-[0.8rem] ${chkReference ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                        📷 추가 레퍼런스 이미지
                      </span>
                    </label>

                    <label className={checkboxLabel(chkPrompt)}>
                      <input
                        type="checkbox"
                        checked={chkPrompt}
                        onChange={(e) => saveIncludeOption('includePrompt', e.target.checked)}
                        className="w-4 h-4 accent-accent-gemini cursor-pointer"
                      />
                      <span className={`text-[0.8rem] ${chkPrompt ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                        ✍️ 추가 프롬프트
                      </span>
                    </label>
                  </div>
                </div>

                {/* 추가 레퍼런스 이미지 업로드 */}
                <div className="mb-3">
                  <label className="block text-[0.75rem] font-medium mb-1.5 text-text-secondary">
                    📷 추가 레퍼런스 이미지 (최대 5장)
                  </label>
                  <div
                    ref={zoneRef}
                    onClick={handleClick}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={uploadZoneClasses}
                    style={uploadZoneStyle}
                  >
                    <span className="text-text-tertiary">
                      {refImages.length > 0
                        ? `➕ ${refImages.length}/5장 (클릭 추가 / Ctrl+V)`
                        : '➕ 클릭하여 선택 또는 Ctrl+V'}
                    </span>
                    {isFocused && (
                      <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 py-1 px-2.5 bg-accent-gemini text-white text-[0.65rem] font-medium rounded-full whitespace-nowrap animate-pulse z-10">
                        📋 Ctrl+V 붙여넣기 | 클릭하면 파일 선택
                      </span>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    multiple
                    hidden
                  />
                  {refImages.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mt-2">
                      {refImages.map((src, i) => (
                        <div key={i} className="relative">
                          <img
                            src={src}
                            alt={`Ref ${i + 1}`}
                            className="w-[50px] h-[50px] object-cover rounded border border-accent-success"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeRefImage(i);
                            }}
                            className="remove-btn absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent-danger border-none text-white cursor-pointer text-[10px] flex items-center justify-center leading-none"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 추가 프롬프트 */}
                <div>
                  <label className="block text-[0.75rem] font-medium mb-1.5 text-text-secondary">
                    ✍️ 추가 프롬프트 (선택)
                  </label>
                  <textarea
                    value={sectionPrompt}
                    onChange={handlePromptChange}
                    placeholder="원하는 스타일이나 수정사항을 입력하세요..."
                    className="w-full py-2 px-2.5 bg-bg-tertiary border border-border-subtle rounded-[10px] text-text-primary font-sans text-[0.8rem] min-h-[60px] resize-y focus:outline-none focus:border-accent-gemini"
                  />
                </div>
              </div>
            </div>

            {/* Footer - 생성 버튼 */}
            <div className="px-6 py-4 border-t border-border-subtle flex-shrink-0">
              <button
                type="button"
                onClick={handleGenerate}
                className="w-full py-3 px-4 text-[0.9rem] font-semibold text-white border-none rounded-[12px] cursor-pointer transition-all duration-150 hover:-translate-y-0.5"
                style={{
                  background: 'var(--gradient-gemini)',
                  boxShadow: 'var(--shadow-gemini)',
                }}
              >
                🍌 이미지 재생성
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      <CopySuggestModal
        isOpen={showSuggestModal}
        onClose={() => setShowSuggestModal(false)}
        sectionIndex={index}
        type={suggestType}
      />
    </>
  );
}
