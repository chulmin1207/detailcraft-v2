import { useState, useRef, useCallback, useEffect } from 'react';
import { compressImage } from '@/features/image-generation/api/image-service';

const MAX_FILE_SIZE: number = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES: string[] = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * 이미지 업로드 커스텀 훅
 *
 * 기능:
 * 1. 클릭: 첫 번째 클릭 = 포커스, 두 번째 클릭 = 파일 선택 창 열기
 * 2. 드래그 앤 드롭
 * 3. Ctrl+V 붙여넣기 (포커스된 상태에서만)
 * 4. 포커스 관리 (한 번에 하나의 업로드 존만 포커스)
 * 5. 파일 유효성 검사 (이미지 타입만, 최대 10MB)
 * 6. compressImage를 이용한 이미지 압축
 */

export interface UseImageUploadOptions {
  maxCount?: number;
  onImagesChange?: (images: string[]) => void;
  onError?: (message: string) => void;
}

export interface UseImageUploadReturn {
  // 상태
  images: string[];
  isFocused: boolean;
  isDragOver: boolean;

  // refs (컴포넌트에서 연결)
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  zoneRef: React.RefObject<HTMLDivElement | null>;

  // 이벤트 핸들러
  handleClick: (e: React.MouseEvent<HTMLElement>) => void;
  handleDragOver: (e: React.DragEvent<HTMLElement>) => void;
  handleDragLeave: (e: React.DragEvent<HTMLElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLElement>) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;

  // 이미지 조작
  removeImage: (index: number) => void;
  clearImages: () => void;
  replaceImages: (newImages: string[]) => void;
  setImages: React.Dispatch<React.SetStateAction<string[]>>;
}

export function useImageUpload(options: UseImageUploadOptions = {}): UseImageUploadReturn {
  const { maxCount = 5, onImagesChange, onError } = options;

  const [images, setImages] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);

  // 이미지 변경 시 콜백 호출을 위한 ref
  const onImagesChangeRef = useRef<((images: string[]) => void) | undefined>(onImagesChange);
  const onErrorRef = useRef<((message: string) => void) | undefined>(onError);
  useEffect(() => {
    onImagesChangeRef.current = onImagesChange;
  }, [onImagesChange]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // 에러 처리 헬퍼
  const reportError = useCallback((message: string): void => {
    if (onErrorRef.current) {
      onErrorRef.current(message);
    } else {
      console.warn('[useImageUpload]', message);
    }
  }, []);

  // 파일 유효성 검사
  const validateFile = useCallback(
    (file: File): boolean => {
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
    [reportError]
  );

  // 파일을 base64 DataURL로 읽기
  const readFileAsDataURL = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('파일 읽기 실패'));
      reader.readAsDataURL(file);
    });
  }, []);

  // 비동기 파일 처리 (압축 포함)
  const processFilesAsync = useCallback(
    async (validFiles: File[]): Promise<void> => {
      const newImages: string[] = [];

      for (const file of validFiles) {
        try {
          const dataUrl = await readFileAsDataURL(file);
          const compressed = await compressImage(dataUrl);
          newImages.push(compressed);
        } catch {
          reportError(`이미지 처리 실패: ${file.name}`);
        }
      }

      if (newImages.length === 0) return;

      setImages((prev) => {
        // 다시 잔여 슬롯 확인 (동시에 여러 processFiles 호출 대비)
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
    [maxCount, readFileAsDataURL, reportError]
  );

  // 파일 처리: 유효성 검사 -> 읽기 -> 압축 -> 상태 업데이트
  const processFiles = useCallback(
    async (fileList: FileList | File[]): Promise<void> => {
      const files = Array.from(fileList);

      setImages((prev) => {
        const remaining = maxCount - prev.length;

        if (remaining <= 0) {
          reportError(`최대 ${maxCount}장까지만 업로드 가능합니다.`);
          return prev;
        }

        // 유효한 파일만 필터링 (남은 슬롯 수 만큼만)
        const validFiles = files.filter((f) => validateFile(f)).slice(0, remaining);

        if (validFiles.length === 0) return prev;

        // 비동기 파일 처리를 시작하고, 완료되면 상태 업데이트
        processFilesAsync(validFiles);
        return prev;
      });
    },
    [maxCount, validateFile, reportError, processFilesAsync]
  );

  // 클릭 핸들러: 첫 번째 클릭 = 포커스, 두 번째 클릭 = 파일 선택
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLElement>): void => {
      // 삭제 버튼 클릭 시 무시
      if ((e.target as HTMLElement).closest('.remove-btn')) return;

      e.stopPropagation();

      if (isFocused) {
        // 이미 포커스된 상태면 파일 선택 창 열기
        fileInputRef.current?.click();
      } else {
        // 포커스 설정
        setIsFocused(true);
      }
    },
    [isFocused]
  );

  // 드래그 이벤트 핸들러
  const handleDragOver = useCallback((e: React.DragEvent<HTMLElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLElement>): void => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  // 파일 input onChange 핸들러
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      if (e.target.files) {
        processFiles(e.target.files);
      }
      // 같은 파일 재업로드를 위해 value 리셋
      e.target.value = '';
    },
    [processFiles]
  );

  // 이미지 제거
  const removeImage = useCallback((index: number): void => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      onImagesChangeRef.current?.(next);
      return next;
    });
  }, []);

  // 이미지 전체 초기화
  const clearImages = useCallback((): void => {
    setImages([]);
    onImagesChangeRef.current?.([]);
  }, []);

  // 외부에서 이미지 설정 (초기값 복원 등)
  const replaceImages = useCallback((newImages: string[]): void => {
    setImages(newImages);
    onImagesChangeRef.current?.(newImages);
  }, []);

  // Ctrl+V 붙여넣기 핸들러 (포커스된 상태에서만 동작)
  useEffect(() => {
    if (!isFocused) return;

    const handler = (e: ClipboardEvent): void => {
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

  // 업로드 존 외부 클릭 시 포커스 해제
  useEffect(() => {
    if (!isFocused) return;

    const handler = (e: MouseEvent): void => {
      if (zoneRef.current && !zoneRef.current.contains(e.target as Node)) {
        setIsFocused(false);
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
  }, [isFocused]);

  return {
    // 상태
    images,
    isFocused,
    isDragOver,

    // refs (컴포넌트에서 연결)
    fileInputRef,
    zoneRef,

    // 이벤트 핸들러
    handleClick,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileChange,

    // 이미지 조작
    removeImage,
    clearImages,
    replaceImages,
    setImages,
  };
}
