import { useRef, useState, useCallback } from 'react';
import { ImagePreview } from './ImagePreview';

interface UploadZoneProps {
  images?: string[];
  onAdd?: (newImages: string[]) => void;
  onRemove?: (index: number) => void;
  maxCount?: number;
  icon?: string;
  text?: string;
  hint?: string;
}

/**
 * 재사용 가능한 이미지 업로드 영역 컴포넌트
 *
 * 기능:
 * 1. 클릭하면 파일 선택 창 열기
 * 2. 드래그 앤 드롭
 * 3. Ctrl+V 붙여넣기 (브라우저 포커스된 상태에서만 — 한 번에 하나만 포커스됨)
 * 4. 포커스 시 .focused 클래스 적용 (index.css에 정의된 borderRotate 애니메이션)
 * 5. 포커스 시 ::after 로 Ctrl+V 힌트 표시
 */
export function UploadZone({
  images = [],
  onAdd,
  onRemove,
  maxCount = 5,
  icon = '\uD83D\uDCE4',
  text = '\uC774\uBBF8\uC9C0\uB97C \uB4DC\uB798\uADF8\uD558\uAC70\uB098 \uD074\uB9AD\uD558\uC138\uC694',
  hint = 'JPG, PNG, WebP (\uCD5C\uB300 10MB)',
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const [dragover, setDragover] = useState(false);
  const [focused, setFocused] = useState(false);

  const readFiles = useCallback(
    (files: FileList | File[]) => {
      const remaining = maxCount - images.length;
      if (remaining <= 0) return;

      const validFiles = Array.from(files)
        .filter((f) => f.type.startsWith('image/'))
        .slice(0, remaining);

      validFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          onAdd?.([e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
    },
    [images.length, maxCount, onAdd],
  );

  // 클릭 → 파일 선택 창 열기
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest('.remove-btn')) return;
      inputRef.current?.click();
    },
    [],
  );

  // 키보드 접근성 — Enter/Space로 파일 선택 창 열기
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        inputRef.current?.click();
      }
    },
    [],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      readFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragover(true);
  };

  const handleDragLeave = () => {
    setDragover(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragover(false);
    if (e.dataTransfer.files?.length) {
      readFiles(e.dataTransfer.files);
    }
  };

  // 브라우저 네이티브 포커스/블러 — 한 번에 하나만 포커스됨
  const handleFocus = useCallback(() => setFocused(true), []);
  const handleBlur = useCallback(() => setFocused(false), []);

  // Ctrl+V 붙여넣기 — onPaste 이벤트로 포커스된 zone에만 동작
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            readFiles([file]);
          }
          break;
        }
      }
    },
    [readFiles],
  );

  const hasImages = images.length > 0;

  return (
    <div>
      <div
        ref={zoneRef}
        tabIndex={0}
        role="button"
        aria-label={`이미지 업로드 (최대 ${maxCount}장)`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onPaste={handlePaste}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          'upload-zone',
          'min-h-[120px] border-2 border-dashed rounded-[16px] p-8 text-center cursor-pointer',
          'transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
          'bg-bg-tertiary outline-none focus-visible:outline-2 focus-visible:outline-accent-primary focus-visible:outline-offset-2',
          dragover
            ? 'border-accent-primary bg-[rgba(99,102,241,0.1)]'
            : 'border-border-default',
          hasImages ? '!border-solid !border-accent-success' : '',
          !dragover && !hasImages
            ? 'hover:border-accent-primary hover:bg-[rgba(99,102,241,0.05)]'
            : '',
          focused ? 'focused' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="text-[2.5rem] mb-3">{icon}</div>
        <p className="text-text-secondary text-sm mb-2">{text}</p>
        <p className="text-text-tertiary text-xs">{hint}</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={handleChange}
      />

      {hasImages && <ImagePreview images={images} onRemove={onRemove} />}
    </div>
  );
}
