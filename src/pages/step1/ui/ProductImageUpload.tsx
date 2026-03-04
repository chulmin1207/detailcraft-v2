import { useCallback } from 'react';
import { useImageStore } from '@/entities/image';
import { UploadZone } from '@/shared/ui/components/UploadZone';
import type { UploadedImages, RefStrength } from '@/shared/types';

/**
 * 제품 이미지 업로드 컴포넌트
 */
export function ProductImageUpload() {
  const { uploadedImages, setUploadedImages, refStrength, setRefStrength } = useImageStore();

  // 이미지 추가 핸들러 팩토리
  const handleAdd = useCallback(
    (type: keyof UploadedImages) => (newImages: string[]) => {
      setUploadedImages((prev) => {
        const current = prev[type] || [];
        const combined = [...current, ...newImages].slice(0, 5);
        return { ...prev, [type]: combined };
      });
    },
    [setUploadedImages],
  );

  // 이미지 삭제 핸들러 팩토리
  const handleRemove = useCallback(
    (type: keyof UploadedImages) => (index: number) => {
      setUploadedImages((prev) => {
        const updated = [...(prev[type] || [])];
        updated.splice(index, 1);
        return { ...prev, [type]: updated };
      });
    },
    [setUploadedImages],
  );

  const hasReferences = uploadedImages.references.length > 0;

  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-[24px] overflow-hidden mb-6">
      {/* 카드 헤더 */}
      <div className="px-6 py-[18px] border-b border-border-subtle flex justify-between items-center">
        <h2 className="text-base font-semibold flex items-center gap-2.5">
          <span>🖼️</span> 제품 이미지 업로드
        </h2>
        <span className="px-2.5 py-1 bg-[rgba(99,102,241,0.1)] text-accent-primary-hover rounded-full text-[0.7rem]">
          선택
        </span>
      </div>

      {/* 카드 바디 */}
      <div className="p-6">
        <div className="grid grid-cols-1 gap-[18px]">
          {/* 제품 촬영 이미지 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.8rem] font-medium flex items-center gap-1.5">
              📷 제품 촬영 이미지 (최대 5장)
            </label>
            <UploadZone
              icon="📷"
              text="클릭하거나 이미지를 드래그하세요"
              hint="PNG, JPG, WEBP (최대 10MB, 5장까지)"
              images={uploadedImages.product}
              onAdd={handleAdd('product')}
              onRemove={handleRemove('product')}
              maxCount={5}
            />
          </div>

          {/* 패키지 디자인 이미지 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.8rem] font-medium flex items-center gap-1.5">
              📦 패키지 디자인 이미지 (최대 5장)
            </label>
            <UploadZone
              icon="📦"
              text="클릭하거나 이미지를 드래그하세요"
              hint="PNG, JPG, WEBP (최대 10MB, 5장까지)"
              images={uploadedImages.package}
              onAdd={handleAdd('package')}
              onRemove={handleRemove('package')}
              maxCount={5}
            />
          </div>

          {/* 전체 톤앤매너 레퍼런스 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.8rem] font-medium flex items-center gap-1.5">
              🎨 전체 톤앤매너 레퍼런스 (최대 5장)
            </label>
            <UploadZone
              icon="🎯"
              text="원하는 스타일의 레퍼런스 이미지를 업로드하세요"
              hint="전체 상세페이지에 적용될 무드/스타일 참고용 (5장까지)"
              images={uploadedImages.references}
              onAdd={handleAdd('references')}
              onRemove={handleRemove('references')}
              maxCount={5}
            />

            {/* 레퍼런스 반영 강도 선택 */}
            {hasReferences && (
              <div className="mt-3">
                <label className="text-[0.8rem] font-medium flex items-center gap-1.5 mt-4 mb-2">
                  📊 레퍼런스 반영 강도
                </label>
                <div className="flex gap-3 mt-2">
                  {/* 약하게 옵션 */}
                  <label
                    className={`
                      flex-1 flex items-center gap-2.5 py-3 px-4
                      border rounded-[10px] cursor-pointer
                      transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]
                      ${refStrength === 'light'
                        ? 'border-accent-gemini bg-[rgba(139,92,246,0.1)]'
                        : 'bg-bg-primary border-border-subtle hover:border-border-strong'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="refStrength"
                      value="light"
                      checked={refStrength === 'light'}
                      onChange={() => setRefStrength('light' as RefStrength)}
                      className="w-[18px] h-[18px] accent-accent-gemini cursor-pointer"
                    />
                    <span className="flex flex-col gap-0.5">
                      <strong className={`text-[0.9rem] ${refStrength === 'light' ? 'text-accent-gemini' : 'text-text-primary'}`}>
                        약하게
                      </strong>
                      <small className="text-[0.75rem] text-text-tertiary">
                        레이아웃만 참고
                      </small>
                    </span>
                  </label>

                  {/* 강하게 옵션 */}
                  <label
                    className={`
                      flex-1 flex items-center gap-2.5 py-3 px-4
                      border rounded-[10px] cursor-pointer
                      transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]
                      ${refStrength === 'strong'
                        ? 'border-accent-gemini bg-[rgba(139,92,246,0.1)]'
                        : 'bg-bg-primary border-border-subtle hover:border-border-strong'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="refStrength"
                      value="strong"
                      checked={refStrength === 'strong'}
                      onChange={() => setRefStrength('strong' as RefStrength)}
                      className="w-[18px] h-[18px] accent-accent-gemini cursor-pointer"
                    />
                    <span className="flex flex-col gap-0.5">
                      <strong className={`text-[0.9rem] ${refStrength === 'strong' ? 'text-accent-gemini' : 'text-text-primary'}`}>
                        강하게
                      </strong>
                      <small className="text-[0.75rem] text-text-tertiary">
                        무드/타이포/배경 반영 (색상은 제품에서)
                      </small>
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
