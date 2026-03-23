import { useState, useCallback, useRef, useEffect } from 'react';
import { useProductStore } from '@/entities/product';
import { useImageStore } from '@/entities/image';
import { useToastStore } from '@/features/theme';
import {
  analyzeProductImages,
  buildPlanPrompt,
  callClaudeForPlan,
  parseSections,
} from '@/features/plan-generation';
import { BACKEND_URL } from '@/shared/config/constants';
import type { Category } from '@/shared/types';
import { ProductForm } from './ProductForm';
import { ProductImageUpload } from './ProductImageUpload';

/**
 * STEP 1 페이지 컴포넌트
 * 제품 정보 입력 + 이미지 업로드 + 기획서 생성
 */
export function Step1Page() {
  const {
    productName,
    category,
    priceRange,
    targetAudience,
    productFeatures,
    additionalNotes,
    setGeneratedPlan,
    setGeneratedSections,
    goToStep,
  } = useProductStore();

  const { uploadedImages, useBackend, claudeApiKey, geminiApiKey } = useImageStore();
  const showToast = useToastStore((s) => s.showToast);

  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);

  // 프로그레스 애니메이션 헬퍼
  const animateProgress = useCallback(async (target: number) => {
    setProgress(target);
    await new Promise((r) => setTimeout(r, 300));
  }, []);

  // 기획서 생성 핸들러
  const handleGenerate = useCallback(async () => {
    // 1. 유효성 검사
    if (!productName.trim()) {
      showToast('제품명을 입력해주세요.', 'error');
      return;
    }

    setLoading(true);
    setShowProgress(true);
    setProgress(0);

    try {
      // 폼 데이터 수집
      const data = {
        productName: productName.trim(),
        category: (category || 'snack') as Category,
        priceRange: priceRange || '미정',
        targetAudience: targetAudience || '일반 소비자',
        productFeatures: productFeatures || '',
        additionalNotes: additionalNotes || '',
      };

      await animateProgress(5);

      // 2. 이미지 분석 단계
      let imageAnalysis = null;
      const hasImages = uploadedImages.product.length > 0 || uploadedImages.package.length > 0;

      if (hasImages) {
        showToast('🔍 제품 이미지 분석 중...', 'success');
        await animateProgress(10);
        try {
          const config = {
            useBackend,
            backendUrl: BACKEND_URL,
            geminiApiKey,
          };
          imageAnalysis = await analyzeProductImages(uploadedImages, config);
          await animateProgress(30);
        } catch (err) {
          showToast('이미지 분석에 실패했습니다. 기본 모드로 기획을 생성합니다.', 'error');
          await animateProgress(30);
        }
      } else {
        await animateProgress(30);
      }

      // 3. 프롬프트 빌드
      const prompt = buildPlanPrompt(data, imageAnalysis);
      await animateProgress(50);

      // 4. Claude API 호출 (기획서 생성)
      const planConfig = {
        useBackend,
        backendUrl: BACKEND_URL,
        claudeApiKey,
      };
      await animateProgress(55);
      const response = await callClaudeForPlan(prompt, planConfig);

      await animateProgress(90);

      // 5. 섹션 파싱
      const sections = parseSections(response);

      await animateProgress(95);

      // 5-1. 생성 후 기본 검증
      const BANNED_WORDS = ['진짜', '완벽한', '완벽', '혁신적', '게임체인저', '놓치지 마세요', '서두르세요', '지금 바로 구매'];
      const warnings: string[] = [];

      for (const section of sections) {
        const allText = [section.headline, section.subCopy, ...section.headlineAlts, ...section.subCopyAlts].join(' ');
        for (const word of BANNED_WORDS) {
          if (allText.includes(word)) {
            warnings.push(`섹션 ${section.number} "${section.name}"에 금지어 "${word}" 포함`);
          }
        }
      }

      if (warnings.length > 0) {
        showToast(`⚠️ ${warnings.length}개 금지어 발견 - Step 2에서 수정하세요`, 'error');
      }

      await animateProgress(100);

      // 6. 상태 업데이트
      setGeneratedPlan(response);
      setGeneratedSections(sections);

      showToast('기획서 생성 완료!', 'success');

      // Step 2로 이동
      setTimeout(() => {
        if (isMountedRef.current) goToStep(2);
      }, 500);
    } catch (error: unknown) {
      console.error('[Step1] 기획서 생성 실패:', error);
      const message = error instanceof Error ? error.message : '기획서 생성 실패';
      showToast(message, 'error');
    } finally {
      setLoading(false);
      setShowProgress(false);
      setProgress(0);
    }
  }, [
    productName, category, priceRange, targetAudience,
    productFeatures, additionalNotes, uploadedImages,
    useBackend, claudeApiKey, geminiApiKey, animateProgress, showToast,
    setGeneratedPlan, setGeneratedSections, goToStep,
  ]);

  return (
    <section>
      {/* 제품 정보 입력 카드 */}
      <ProductForm />

      {/* 제품 이미지 업로드 카드 */}
      <ProductImageUpload />

      {/* 생성 버튼 */}
      <div className="text-center mt-6">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className={`
            inline-flex items-center gap-3 py-4 px-12
            border-none rounded-[16px] text-white font-[inherit] text-base font-semibold
            cursor-pointer transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]
            disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
            ${!loading
              ? 'hover:-translate-y-0.5 hover:shadow-[0_0_60px_rgba(99,102,241,0.5)]'
              : ''
            }
          `}
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
            boxShadow: '0 0 40px rgba(99, 102, 241, 0.4)',
          }}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-[rgba(255,255,255,0.3)] border-t-white rounded-full animate-spin" />
          ) : (
            <span>⚡ 기획서 생성하기</span>
          )}
        </button>
      </div>

      {/* 프로그레스 바 */}
      {showProgress && (
        <div
          className="mt-6 p-6 bg-bg-secondary border border-border-subtle rounded-[24px]"
          style={{ animation: 'fadeIn 0.3s ease' }}
        >
          <div className="flex justify-between mb-3">
            <span className="font-medium text-[0.9rem]">
              AI가 기획서를 생성하고 있습니다...
            </span>
            <span className="text-accent-primary-hover font-semibold">
              {progress}%
            </span>
          </div>
          <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-500 ease-out"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
