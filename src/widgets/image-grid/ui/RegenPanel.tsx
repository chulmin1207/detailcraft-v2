import { useState, useCallback, useEffect } from 'react';
import { useImageStore } from '@/entities/image';
import { useToastStore } from '@/features/theme';
import { useImageUpload } from '@/shared/hooks/useImageUpload';
import type { ModelType } from '@/shared/types';

interface RegenPanelProps {
  index: number;
  onRegenerate: (index: number, options: { withOptions: boolean }) => void;
}

/**
 * 재생성 옵션 패널 (접이식)
 */
export function RegenPanel({ index, onRegenerate }: RegenPanelProps) {
  const {
    step3References,
    setStep3References,
    step3Prompts,
    setStep3Prompts,
    step3Models,
    setStep3Models,
    step3IncludeOptions,
    setStep3IncludeOptions,
    selectedModel,
    uploadedImages,
    generatedImages,
  } = useImageStore();
  const showToast = useToastStore((s) => s.showToast);

  const [isOpen, setIsOpen] = useState(false);

  const hasImage = generatedImages[index] && !generatedImages[index].error;
  const step1RefCount = uploadedImages.references.length;
  const sectionModel: ModelType = (step3Models[index] as ModelType) || selectedModel;
  const sectionPrompt = step3Prompts[index] || '';

  const opts = step3IncludeOptions[index] || {};
  const chkGenerated =
    opts.includeGenerated !== undefined ? opts.includeGenerated : hasImage;
  const chkStep1Ref =
    opts.includeStep1Ref !== undefined ? opts.includeStep1Ref : false;
  const chkReference =
    opts.includeReference !== undefined ? opts.includeReference : false;
  const chkPrompt =
    opts.includePrompt !== undefined ? opts.includePrompt : true;

  const handleModelChange = useCallback(
    (model: ModelType) => {
      setStep3Models((prev) => ({ ...prev, [index]: model }));
    },
    [index, setStep3Models],
  );

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = useCallback(() => {
    if (onRegenerate) {
      onRegenerate(index, { withOptions: true });
    }
  }, [index, onRegenerate]);

  const toggleIcon = isOpen ? '\u25B2' : '\u25BC';

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

  return (
    <div className="border-t border-border-subtle">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 flex justify-between items-center cursor-pointer text-[0.8rem] text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-all duration-150"
      >
        <span>🎨 재생성 옵션</span>
        <span
          className={`transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
        >
          {toggleIcon}
        </span>
      </button>

      {isOpen && (
        <div className="p-4 bg-bg-tertiary border-t border-border-subtle">
          {/* 모델 선택 */}
          <div className="mb-3">
            <label className="block text-[0.75rem] font-medium mb-1.5 text-text-secondary">
              🤖 생성 모델
            </label>
            <div className="flex gap-2">
              <label className="flex-1 cursor-pointer">
                <input
                  type="radio"
                  name={`regenModel${index}`}
                  value="fast"
                  checked={sectionModel === 'fast'}
                  onChange={() => handleModelChange('fast')}
                  className="hidden"
                />
                <span
                  className={[
                    'block py-2 px-2.5 border rounded-[6px] text-[0.7rem] text-center transition-all duration-150',
                    sectionModel === 'fast'
                      ? 'border-accent-gemini bg-[rgba(139,92,246,0.15)] text-accent-gemini font-semibold'
                      : 'bg-bg-primary border-border-subtle hover:border-border-strong',
                  ].join(' ')}
                >
                  ⚡ 빠름 (10~30초)
                </span>
              </label>
              <label className="flex-1 cursor-pointer">
                <input
                  type="radio"
                  name={`regenModel${index}`}
                  value="quality"
                  checked={sectionModel === 'quality'}
                  onChange={() => handleModelChange('quality')}
                  className="hidden"
                />
                <span
                  className={[
                    'block py-2 px-2.5 border rounded-[6px] text-[0.7rem] text-center transition-all duration-150',
                    sectionModel === 'quality'
                      ? 'border-accent-gemini bg-[rgba(139,92,246,0.15)] text-accent-gemini font-semibold'
                      : 'bg-bg-primary border-border-subtle hover:border-border-strong',
                  ].join(' ')}
                >
                  🎨 고품질 (1~5분)
                </span>
              </label>
            </div>
          </div>

          {/* 포함 요소 체크박스 */}
          <div className="mb-3">
            <label className="block text-[0.75rem] font-medium mb-1.5 text-text-secondary">
              🎯 재생성에 포함할 요소
            </label>
            <div className="flex flex-col gap-1.5">
              <label
                className={[
                  'flex items-center gap-2 py-2 px-3 border rounded-[6px] transition-all duration-150',
                  !hasImage ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                  chkGenerated && hasImage
                    ? 'border-accent-gemini bg-[rgba(139,92,246,0.1)]'
                    : 'bg-bg-primary border-border-subtle hover:border-border-strong',
                ].join(' ')}
              >
                <input
                  type="checkbox"
                  checked={chkGenerated}
                  disabled={!hasImage}
                  onChange={(e) =>
                    saveIncludeOption('includeGenerated', e.target.checked)
                  }
                  className="w-4 h-4 accent-accent-gemini cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span
                  className={[
                    'text-[0.8rem]',
                    chkGenerated && hasImage
                      ? 'text-text-primary font-medium'
                      : 'text-text-secondary',
                  ].join(' ')}
                >
                  🖼️ 기존 생성 이미지
                </span>
              </label>

              <label
                className={[
                  'flex items-center gap-2 py-2 px-3 border rounded-[6px] transition-all duration-150',
                  step1RefCount === 0
                    ? 'opacity-50 cursor-not-allowed'
                    : 'cursor-pointer',
                  chkStep1Ref && step1RefCount > 0
                    ? 'border-accent-gemini bg-[rgba(139,92,246,0.1)]'
                    : 'bg-bg-primary border-border-subtle hover:border-border-strong',
                ].join(' ')}
              >
                <input
                  type="checkbox"
                  checked={chkStep1Ref}
                  disabled={step1RefCount === 0}
                  onChange={(e) =>
                    saveIncludeOption('includeStep1Ref', e.target.checked)
                  }
                  className="w-4 h-4 accent-accent-gemini cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span
                  className={[
                    'text-[0.8rem]',
                    chkStep1Ref && step1RefCount > 0
                      ? 'text-text-primary font-medium'
                      : 'text-text-secondary',
                  ].join(' ')}
                >
                  🎨 STEP 1 전체 레퍼런스 ({step1RefCount}장)
                </span>
              </label>

              <label
                className={[
                  'flex items-center gap-2 py-2 px-3 border rounded-[6px] cursor-pointer transition-all duration-150',
                  chkReference
                    ? 'border-accent-gemini bg-[rgba(139,92,246,0.1)]'
                    : 'bg-bg-primary border-border-subtle hover:border-border-strong',
                ].join(' ')}
              >
                <input
                  type="checkbox"
                  checked={chkReference}
                  onChange={(e) =>
                    saveIncludeOption('includeReference', e.target.checked)
                  }
                  className="w-4 h-4 accent-accent-gemini cursor-pointer"
                />
                <span
                  className={[
                    'text-[0.8rem]',
                    chkReference
                      ? 'text-text-primary font-medium'
                      : 'text-text-secondary',
                  ].join(' ')}
                >
                  📷 추가 레퍼런스 이미지
                </span>
              </label>

              <label
                className={[
                  'flex items-center gap-2 py-2 px-3 border rounded-[6px] cursor-pointer transition-all duration-150',
                  chkPrompt
                    ? 'border-accent-gemini bg-[rgba(139,92,246,0.1)]'
                    : 'bg-bg-primary border-border-subtle hover:border-border-strong',
                ].join(' ')}
              >
                <input
                  type="checkbox"
                  checked={chkPrompt}
                  onChange={(e) =>
                    saveIncludeOption('includePrompt', e.target.checked)
                  }
                  className="w-4 h-4 accent-accent-gemini cursor-pointer"
                />
                <span
                  className={[
                    'text-[0.8rem]',
                    chkPrompt
                      ? 'text-text-primary font-medium'
                      : 'text-text-secondary',
                  ].join(' ')}
                >
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
          <div className="mb-2">
            <label className="block text-[0.75rem] font-medium mb-1.5 text-text-secondary">
              ✍️ 추가 프롬프트 (선택)
            </label>
            <textarea
              value={sectionPrompt}
              onChange={handlePromptChange}
              placeholder="원하는 스타일이나 수정사항을 입력하세요..."
              className="w-full py-2 px-2.5 bg-bg-primary border border-border-subtle rounded-[10px] text-text-primary font-sans text-[0.8rem] min-h-[60px] resize-y focus:outline-none focus:border-accent-gemini"
            />
          </div>

          {/* 생성 버튼 */}
          <button
            type="button"
            onClick={handleGenerate}
            className="w-full mt-2 py-2.5 px-4 text-[0.85rem] font-semibold text-white border-none rounded-[10px] cursor-pointer transition-all duration-150 hover:-translate-y-0.5"
            style={{
              background: 'var(--gradient-gemini)',
              boxShadow: 'var(--shadow-gemini)',
            }}
          >
            🍌 내용으로 이미지 생성
          </button>
        </div>
      )}
    </div>
  );
}
