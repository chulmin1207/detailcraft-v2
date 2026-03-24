import { useCallback, useState, useEffect, useRef } from 'react';
import { useImageStore } from '@/entities/image';

type SlotType = 'product' | 'references' | 'toneReferences';

function useUploadZone(type: SlotType, max: number) {
  const { uploadedImages, setUploadedImages } = useImageStore();
  const [focused, setFocused] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const zoneRef = useRef<HTMLDivElement>(null);
  const clickCount = useRef(0);
  const clickTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const addImages = useCallback((files: FileList | File[]) => {
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setUploadedImages((prev) => ({
          ...prev,
          [type]: type === 'product'
            ? [dataUrl]
            : [...prev[type], dataUrl].slice(0, max),
        }));
      };
      reader.readAsDataURL(file);
    });
  }, [type, max, setUploadedImages]);

  const openFileDialog = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = type !== 'product';
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) addImages(files);
    };
    input.click();
  }, [type, addImages]);

  // 클릭 핸들러: 1클릭 = 포커스(붙여넣기 대기), 2클릭 = 파일 선택
  const handleClick = useCallback(() => {
    clickCount.current++;
    if (clickCount.current === 1) {
      clickTimer.current = setTimeout(() => {
        // 싱글 클릭: 포커스 모드 (붙여넣기 대기)
        setFocused(true);
        zoneRef.current?.focus();
        clickCount.current = 0;
      }, 250);
    } else {
      // 더블 클릭 또는 포커스 상태에서 재클릭: 파일 선택
      clearTimeout(clickTimer.current);
      clickCount.current = 0;
      openFileDialog();
    }
  }, [openFileDialog]);

  // 포커스 상태에서 클릭 → 파일 선택
  const handleFocusedClick = useCallback(() => {
    openFileDialog();
  }, [openFileDialog]);

  // 붙여넣기 핸들러
  useEffect(() => {
    if (!focused) return;
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        addImages(files);
      }
    };
    document.addEventListener('paste', handler);
    return () => document.removeEventListener('paste', handler);
  }, [focused, addImages]);

  // 외부 클릭 시 포커스 해제
  useEffect(() => {
    if (!focused) return;
    const handler = (e: MouseEvent) => {
      if (zoneRef.current && !zoneRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    setTimeout(() => document.addEventListener('click', handler), 0);
    return () => document.removeEventListener('click', handler);
  }, [focused]);

  // 드래그 앤 드랍
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      addImages(e.dataTransfer.files);
    }
  }, [addImages]);

  const handleRemove = useCallback((index: number) => {
    setUploadedImages((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index),
    }));
  }, [type, setUploadedImages]);

  return {
    images: uploadedImages[type],
    focused,
    dragOver,
    zoneRef,
    handleClick: focused ? handleFocusedClick : handleClick,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleRemove,
  };
}

export function ProductImageUpload() {
  const product = useUploadZone('product', 1);
  const toneRefs = useUploadZone('toneReferences', 3);
  const references = useUploadZone('references', 13);

  const zoneClass = (focused: boolean, dragOver: boolean) => [
    'border-2 border-dashed rounded-xl p-4 min-h-[200px] cursor-pointer transition-all duration-200 outline-none',
    dragOver
      ? 'border-accent-primary bg-accent-primary/5 scale-[1.02]'
      : focused
        ? 'border-accent-primary shadow-[0_0_0_3px_rgba(99,102,241,0.3)]'
        : 'border-border-subtle hover:border-accent-primary/50',
  ].join(' ');

  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-2xl p-6 mb-6">
      <h2 className="text-lg font-bold text-text-primary mb-4">이미지 업로드</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 제품 이미지 */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            제품 이미지 <span className="text-red-400">*</span>
          </label>
          <div
            ref={product.zoneRef}
            tabIndex={0}
            onClick={product.handleClick}
            onDragOver={product.handleDragOver}
            onDragLeave={product.handleDragLeave}
            onDrop={product.handleDrop}
            className={zoneClass(product.focused, product.dragOver)}
          >
            {product.images.length > 0 ? (
              <div className="relative w-full">
                <img src={product.images[0]} alt="제품" className="w-full h-48 object-contain rounded-lg" />
                <button
                  onClick={(e) => { e.stopPropagation(); product.handleRemove(0); }}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="text-center text-text-tertiary flex flex-col items-center justify-center h-full">
                <div className="text-3xl mb-2">📦</div>
                <div className="text-sm font-medium">제품/패키지 이미지</div>
                <div className="text-xs mt-1.5 text-text-tertiary/70">
                  {product.focused
                    ? '붙여넣기 (Ctrl+V) 또는 클릭하여 파일 선택'
                    : '클릭 · 드래그 · 붙여넣기'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 톤 레퍼런스 */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            톤 레퍼런스 (최대 3장)
            <span className="block text-xs text-text-tertiary mt-0.5">배경색 · 타이포 색상 · 전체 톤</span>
          </label>
          <div
            ref={toneRefs.zoneRef}
            tabIndex={0}
            onClick={toneRefs.handleClick}
            onDragOver={toneRefs.handleDragOver}
            onDragLeave={toneRefs.handleDragLeave}
            onDrop={toneRefs.handleDrop}
            className={zoneClass(toneRefs.focused, toneRefs.dragOver)}
          >
            {toneRefs.images.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {toneRefs.images.map((img, i) => (
                  <div key={i} className="relative">
                    <img src={img} alt={`tone-${i}`} className="w-full h-24 object-cover rounded-lg" />
                    <button
                      onClick={(e) => { e.stopPropagation(); toneRefs.handleRemove(i); }}
                      className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center hover:bg-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {toneRefs.images.length < 3 && (
                  <div className="w-full h-24 border border-dashed border-border-subtle rounded-lg flex items-center justify-center text-text-tertiary text-xl">
                    +
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-text-tertiary flex flex-col items-center justify-center h-full">
                <div className="text-3xl mb-2">🎨</div>
                <div className="text-sm font-medium">톤/색감 레퍼런스</div>
                <div className="text-xs mt-1.5 text-text-tertiary/70">
                  {toneRefs.focused
                    ? '붙여넣기 (Ctrl+V) 또는 클릭하여 파일 선택'
                    : '클릭 · 드래그 · 붙여넣기'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 레이아웃 레퍼런스 */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            레이아웃 레퍼런스 (최대 13장)
            <span className="block text-xs text-text-tertiary mt-0.5">섹션 구조 · 정보 배치 참고</span>
          </label>
          <div
            ref={references.zoneRef}
            tabIndex={0}
            onClick={references.handleClick}
            onDragOver={references.handleDragOver}
            onDragLeave={references.handleDragLeave}
            onDrop={references.handleDrop}
            className={zoneClass(references.focused, references.dragOver)}
          >
            {references.images.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {references.images.map((img, i) => (
                  <div key={i} className="relative">
                    <img src={img} alt={`ref-${i}`} className="w-full h-24 object-cover rounded-lg" />
                    <button
                      onClick={(e) => { e.stopPropagation(); references.handleRemove(i); }}
                      className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center hover:bg-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {references.images.length < 13 && (
                  <div className="w-full h-24 border border-dashed border-border-subtle rounded-lg flex items-center justify-center text-text-tertiary text-xl">
                    +
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-text-tertiary flex flex-col items-center justify-center h-full">
                <div className="text-3xl mb-2">📐</div>
                <div className="text-sm font-medium">레이아웃 레퍼런스</div>
                <div className="text-xs mt-1.5 text-text-tertiary/70">
                  {references.focused
                    ? '붙여넣기 (Ctrl+V) 또는 클릭하여 파일 선택'
                    : '클릭 · 드래그 · 붙여넣기'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
