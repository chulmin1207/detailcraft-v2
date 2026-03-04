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

  const handleClick = () => {
    inputRef.current?.click();
  };

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

  const handleFocus = () => setFocused(true);
  const handleBlur = () => setFocused(false);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault();
        readFiles(imageFiles);
      }
    },
    [readFiles],
  );

  const hasImages = images.length > 0;

  return (
    <div>
      <div
        tabIndex={0}
        role="button"
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onPaste={handlePaste}
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
