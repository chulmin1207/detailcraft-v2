import { useRef, useState, useCallback, useEffect } from 'react';
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
 * 1. 클릭: 첫 번째 클릭 = 포커스 (애니메이션 테두리), 두 번째 클릭 = 파일 선택 창 열기
 * 2. 드래그 앤 드롭
 * 3. Ctrl+V 붙여넣기 (포커스된 상태에서만)
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

  // 클릭 핸들러: 첫 번째 클릭 = 포커스, 두 번째 클릭 = 파일 선택
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // 삭제 버튼 클릭 시 무시
      if ((e.target as HTMLElement).closest('.remove-btn')) return;

      e.stopPropagation();

      if (focused) {
        // 이미 포커스된 상태면 파일 선택 창 열기
        inputRef.current?.click();
      } else {
        // 포커스 설정 (애니메이션 테두리 표시)
        setFocused(true);
      }
    },
    [focused],
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

  // Ctrl+V 붙여넣기 (포커스된 상태에서만 document 레벨에서 캐치)
  useEffect(() => {
    if (!focused) return;

    const handler = (e: ClipboardEvent) => {
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
    };

    document.addEventListener('paste', handler);
    return () => document.removeEventListener('paste', handler);
  }, [focused, readFiles]);

  // 업로드 존 외부 클릭 시 포커스 해제
  useEffect(() => {
    if (!focused) return;

    const handler = (e: MouseEvent) => {
      if (zoneRef.current && !zoneRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };

    // 현재 클릭 이벤트 전파 후 리스너를 등록하도록 setTimeout 사용
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handler);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handler);
    };
  }, [focused]);

  const hasImages = images.length > 0;

  return (
    <div>
      <div
        ref={zoneRef}
        tabIndex={0}
        role="button"
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          'upload-zone',
          'min-h-[120px] border-2 border-dashed rounded-[16px] p-8 text-center cursor-pointer',
          'transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
          'bg-bg-tertiary outline-none',
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
