import { useState, useRef, useCallback, useEffect } from 'react';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

interface UseImageUploadOptions {
  maxCount?: number;
  onImagesChange?: (images: string[]) => void;
  onError?: (message: string) => void;
}

export function useImageUpload({
  maxCount = 5,
  onImagesChange,
  onError,
}: UseImageUploadOptions = {}) {
  const [images, setImages] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);

  const onImagesChangeRef = useRef(onImagesChange);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onImagesChangeRef.current = onImagesChange;
  }, [onImagesChange]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const reportError = useCallback((message: string) => {
    if (onErrorRef.current) {
      onErrorRef.current(message);
    } else {
      console.warn('[useImageUpload]', message);
    }
  }, []);

  const validateFile = useCallback(
    (file: File) => {
      if (!file) return false;

      if (!ALLOWED_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
        reportError('이미지 파일만 업로드 가능합니다.');
        return false;
      }

      if (file.size > MAX_FILE_SIZE) {
        reportError('파일이 너무 큽니다. 10MB 이하 이미지를 사용해주세요.');
        return false;
      }

      return true;
    },
    [reportError],
  );

  const readFileAsDataURL = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('파일 읽기 실패'));
      reader.readAsDataURL(file);
    });
  }, []);

  const processFilesAsync = useCallback(
    async (validFiles: File[]) => {
      const newImages: string[] = [];

      for (const file of validFiles) {
        try {
          const dataUrl = await readFileAsDataURL(file);
          newImages.push(dataUrl);
        } catch {
          reportError(`이미지 처리 실패: ${file.name}`);
        }
      }

      if (newImages.length === 0) return;

      setImages((prev) => {
        const remaining = maxCount - prev.length;
        const toAdd = newImages.slice(0, remaining);

        if (toAdd.length === 0) {
          reportError(`최대 ${maxCount}장까지만 업로드 가능합니다.`);
          return prev;
        }

        const next = [...prev, ...toAdd];
        onImagesChangeRef.current?.(next);
        return next;
      });
    },
    [maxCount, readFileAsDataURL, reportError],
  );

  const processFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);

      setImages((prev) => {
        const remaining = maxCount - prev.length;

        if (remaining <= 0) {
          reportError(`최대 ${maxCount}장까지만 업로드 가능합니다.`);
          return prev;
        }

        const validFiles = files.filter((f) => validateFile(f)).slice(0, remaining);

        if (validFiles.length === 0) return prev;

        processFilesAsync(validFiles);
        return prev;
      });
    },
    [maxCount, validateFile, reportError, processFilesAsync],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('.remove-btn')) return;

      e.stopPropagation();

      if (isFocused) {
        fileInputRef.current?.click();
      } else {
        setIsFocused(true);
      }
    },
    [isFocused],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      processFiles(e.dataTransfer.files);
    },
    [processFiles],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        processFiles(e.target.files);
      }
      e.target.value = '';
    },
    [processFiles],
  );

  const removeImage = useCallback((index: number) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      onImagesChangeRef.current?.(next);
      return next;
    });
  }, []);

  const clearImages = useCallback(() => {
    setImages([]);
    onImagesChangeRef.current?.([]);
  }, []);

  const replaceImages = useCallback((newImages: string[]) => {
    setImages(newImages);
    onImagesChangeRef.current?.(newImages);
  }, []);

  // Ctrl+V paste handler (only when focused)
  useEffect(() => {
    if (!isFocused) return;

    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            processFiles([file]);
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handler);
    return () => document.removeEventListener('paste', handler);
  }, [isFocused, processFiles]);

  // Click outside to unfocus
  useEffect(() => {
    if (!isFocused) return;

    const handler = (e: MouseEvent) => {
      if (zoneRef.current && !zoneRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handler);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handler);
    };
  }, [isFocused]);

  return {
    images,
    isFocused,
    isDragOver,
    fileInputRef,
    zoneRef,
    handleClick,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileChange,
    removeImage,
    clearImages,
    replaceImages,
    setImages,
  };
}
