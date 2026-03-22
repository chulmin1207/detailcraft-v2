import { useState, useCallback } from 'react';
import { useProductStore } from '@/entities/product';
import { useImageStore } from '@/entities/image';
import { useToastStore } from '@/features/theme';
import { PLATFORM_CONFIGS } from '@/shared/config/constants';
import { downloadAllImages } from '@/features/download/api/download-service';

type DownloadResult = { imageCount: number; platformCount: number };

/**
 * 다운로드 섹션 컴포넌트
 */
export function DownloadSection() {
  const { generatedSections, productName } = useProductStore();
  const generatedImages = useImageStore((s) => s.generatedImages);
  const showToast = useToastStore((s) => s.showToast);
  const [downloading, setDownloading] = useState(false);
  const [buttonText, setButtonText] = useState('⬇️ 전체 다운로드 (ZIP)');

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    setButtonText('⏳ ZIP 생성 중...');

    try {
      const result: DownloadResult = await downloadAllImages(
        generatedImages,
        generatedSections,
        productName,
      );
      showToast(
        `${result.imageCount}개 이미지 × ${result.platformCount}개 플랫폼 다운로드 완료!`,
        'success',
      );
    } catch (error) {
      console.error('[DownloadSection] 이미지 다운로드 실패:', error);
      showToast(
        error instanceof Error
          ? error.message
          : '다운로드 중 오류가 발생했습니다.',
        'error',
      );
    } finally {
      setDownloading(false);
      setButtonText('⬇️ 전체 다운로드 (ZIP)');
    }
  }, [generatedImages, generatedSections, productName, showToast]);

  const hasAnyImage = Object.values(generatedImages).some(
    (img) => img && !img.error,
  );

  return (
    <div
      className="mt-8 p-6 border rounded-[24px] text-center"
      style={{
        background:
          'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1))',
        borderColor: 'rgba(139, 92, 246, 0.3)',
      }}
    >
      <h3 className="text-[1.125rem] font-semibold mb-2 text-text-primary">
        📥 플랫폼별 이미지 다운로드
      </h3>
      <p className="text-[0.875rem] text-text-secondary mb-4">
        모든 플랫폼 규격에 맞게 리사이즈된 이미지를 폴더별로 다운로드합니다.
      </p>

      <div className="flex flex-wrap justify-center gap-2 mb-5">
        {PLATFORM_CONFIGS.map((platform) => (
          <div
            key={platform.folder}
            className="py-1.5 px-3 bg-bg-tertiary border border-border-default rounded-full text-[0.75rem] text-text-secondary"
          >
            {platform.name} {platform.width}px
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading || !hasAnyImage}
        className="inline-flex items-center gap-3 py-4 px-12 border-none rounded-[16px] text-white font-sans text-base font-semibold cursor-pointer transition-all duration-250 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        style={{
          background: 'var(--gradient-gemini)',
          boxShadow: 'var(--shadow-gemini)',
        }}
      >
        <span>{buttonText}</span>
      </button>

      <p className="mt-3 text-[0.75rem] text-text-tertiary">
        플랫폼별 폴더로 자동 정리됩니다
      </p>
    </div>
  );
}
