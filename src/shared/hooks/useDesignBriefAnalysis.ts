// ===== 디자인 브리프 자동 분석 훅 =====
// 이미지 업로드 시 백그라운드로 비전 분석 실행

import { useEffect, useRef, useCallback } from 'react';
import { useImageStore } from '@/entities/image';
import { useToastStore } from '@/features/theme';
import { analyzeAllImages } from '@/features/vision-analysis';
import { BACKEND_URL } from '@/shared/config/constants';
import type { UploadedImages } from '@/shared/types';

/** 이미지 fingerprint 생성 (변경 감지용) */
function getFingerprint(imgs: UploadedImages): string {
  const keys = ['product', 'package', 'references'] as const;
  return keys
    .map(
      (k) =>
        `${k}:${imgs[k].length}:${imgs[k].map((i) => i.slice(22, 72)).join(',')}`
    )
    .join('|');
}

/**
 * 업로드된 이미지가 변경될 때마다 자동으로 비전 분석을 실행하여
 * DesignBrief를 생성하는 훅.
 *
 * - 2초 디바운스
 * - 이미지 변경 시 이전 요청 취소 + 재분석
 * - API 키 없으면 스킵
 * - 결과는 store에 캐싱
 */
export function useDesignBriefAnalysis(): void {
  const uploadedImages = useImageStore((s) => s.uploadedImages);
  const setDesignBrief = useImageStore((s) => s.setDesignBrief);
  const setIsAnalyzing = useImageStore((s) => s.setIsAnalyzing);
  const setAnalysisError = useImageStore((s) => s.setAnalysisError);
  const useBackend = useImageStore((s) => s.useBackend);
  const geminiApiKey = useImageStore((s) => s.geminiApiKey);
  const showToast = useToastStore((s) => s.showToast);

  const prevFingerprintRef = useRef('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortFlagRef = useRef(false);

  const runAnalysis = useCallback(async () => {
    // API 키 확인 (백엔드 사용 시 불필요)
    if (!useBackend && !geminiApiKey) return;

    abortFlagRef.current = false;
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const brief = await analyzeAllImages(uploadedImages, {
        useBackend,
        backendUrl: BACKEND_URL,
        geminiApiKey,
      });

      // 분석 중 이미지가 변경되어 abort된 경우 결과 무시
      if (abortFlagRef.current) return;

      if (brief) {
        setDesignBrief(brief);
        showToast('디자인 브리프 분석 완료!', 'success');
      }
    } catch (err) {
      if (abortFlagRef.current) return;
      const message = err instanceof Error ? err.message : '분석 실패';
      console.warn('Vision analysis failed:', err);
      setAnalysisError(message);
    } finally {
      if (!abortFlagRef.current) {
        setIsAnalyzing(false);
      }
    }
  }, [uploadedImages, useBackend, geminiApiKey, setDesignBrief, setIsAnalyzing, setAnalysisError, showToast]);

  useEffect(() => {
    const hasAnyImages =
      uploadedImages.product.length > 0 ||
      uploadedImages.package.length > 0 ||
      uploadedImages.references.length > 0;

    if (!hasAnyImages) {
      setDesignBrief(null);
      setAnalysisError(null);
      prevFingerprintRef.current = '';
      return;
    }

    const fingerprint = getFingerprint(uploadedImages);
    if (fingerprint === prevFingerprintRef.current) return;

    // 이전 타이머/요청 취소
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    abortFlagRef.current = true;

    prevFingerprintRef.current = fingerprint;

    // 2초 디바운스
    debounceTimerRef.current = setTimeout(() => {
      runAnalysis();
    }, 2000);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [uploadedImages, runAnalysis, setDesignBrief, setAnalysisError]);
}
