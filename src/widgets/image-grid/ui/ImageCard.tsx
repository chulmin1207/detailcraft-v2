import { useCallback } from 'react';
import { useProductStore } from '@/entities/product';
import { useImageStore } from '@/entities/image';
import { useToastStore } from '@/features/theme';
import { downloadSingle } from '@/features/download';
import { RegenPanel } from './RegenPanel';
import type { Section } from '@/shared/types';

interface ImageCardProps {
  index: number;
  section: Section;
  onRegenerate: (index: number, options: { withOptions: boolean }) => void;
}

/**
 * 이미지 카드 컴포넌트
 */
export function ImageCard({ index, section, onRegenerate }: ImageCardProps) {
  const generatedSections = useProductStore((s) => s.generatedSections);
  const { generatedImages, useBackend, geminiApiKey } = useImageStore();
  const showToast = useToastStore((s) => s.showToast);

  const img = generatedImages[index];
  const hasImage = img && !img.error;
  const status = !img ? 'pending' : img.error ? 'error' : 'complete';

  const statusConfig: Record<
    string,
    { text: string; className: string }
  > = {
    pending: {
      text: '대기중',
      className: 'bg-[rgba(245,158,11,0.2)] text-accent-warning',
    },
    generating: {
      text: '생성 중...',
      className: 'bg-[rgba(139,92,246,0.2)] text-accent-gemini animate-pulse',
    },
    complete: {
      text: '완료',
      className: 'bg-[rgba(16,185,129,0.2)] text-accent-success',
    },
    error: {
      text: '실패',
      className: 'bg-[rgba(239,68,68,0.2)] text-accent-danger',
    },
  };
  const currentStatus = statusConfig[status] || statusConfig.pending;

  const handleRandomRegen = useCallback(() => {
    if (onRegenerate) {
      onRegenerate(index, { withOptions: false });
    }
  }, [index, onRegenerate]);

  const handleDownload = useCallback(() => {
    try {
      downloadSingle(index, generatedImages, generatedSections);
    } catch {
      showToast('다운로드에 실패했습니다.', 'error');
    }
  }, [index, generatedImages, generatedSections, showToast]);

  const canGenerate = useBackend || !!geminiApiKey;

  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-[16px] overflow-hidden">
      <div className="px-4 py-3 border-b border-border-subtle flex justify-between items-center">
        <span className="text-[0.85rem] font-semibold text-text-primary">
          {section.number}. {section.name}
        </span>
        <span
          className={`text-[0.7rem] py-1 px-2 rounded-full ${currentStatus.className}`}
        >
          {currentStatus.text}
        </span>
      </div>

      <div className="p-4 min-h-[200px] flex items-center justify-center bg-bg-tertiary">
        {hasImage ? (
          <img
            src={img.data}
            alt={section.name}
            className="max-w-full max-h-[250px] rounded-[6px]"
          />
        ) : (
          <div className="text-center text-text-tertiary">
            <div className="text-[2rem] mb-2">
              {status === 'error' ? '❌' : '🖼️'}
            </div>
            <p className="text-sm">{img?.error || '이미지 없음'}</p>
          </div>
        )}
      </div>

      <RegenPanel index={index} onRegenerate={onRegenerate} />

      <div className="px-4 py-3 border-t border-border-subtle flex gap-2">
        <button
          type="button"
          onClick={handleRandomRegen}
          disabled={!canGenerate}
          className="flex-1 py-2 px-3 text-[0.8rem] font-medium rounded-[10px] border border-border-subtle bg-bg-secondary text-text-secondary cursor-pointer transition-all duration-150 hover:bg-bg-hover hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🔄 랜덤 재생성
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!hasImage}
          className="flex-1 py-2 px-3 text-[0.8rem] font-medium rounded-[10px] border-none text-white cursor-pointer transition-all duration-150 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'var(--accent-primary)' }}
        >
          ⬇️ 다운로드
        </button>
      </div>
    </div>
  );
}
