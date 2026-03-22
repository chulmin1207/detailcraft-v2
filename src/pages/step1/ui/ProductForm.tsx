import { useState } from 'react';
import { useProductStore } from '@/entities/product';
import type { Category } from '@/shared/types';

// 카테고리 옵션 목록
const CATEGORY_OPTIONS: Array<{ value: Category; label: string }> = [
  { value: 'snack', label: '스낵 / 과자 / 제과' },
  { value: 'beverage', label: '음료 / 주류' },
  { value: 'instant', label: '즉석식품 / 간편식' },
  { value: 'health', label: '건강식품 / 보충제' },
  { value: 'beauty', label: '뷰티 / 화장품' },
  { value: 'living', label: '생활용품' },
  { value: 'other', label: '기타' },
];

/**
 * 제품 정보 입력 폼 컴포넌트
 */
export function ProductForm() {
  const {
    productName, setProductName,
    category, setCategory,
    priceRange, setPriceRange,
    targetAudience, setTargetAudience,
    productFeatures, setProductFeatures,
    additionalNotes, setAdditionalNotes,
  } = useProductStore();

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const isProductNameInvalid = touched.productName && !productName.trim();

  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-[24px] overflow-hidden mb-6">
      {/* 카드 헤더 */}
      <div className="px-6 py-[18px] border-b border-border-subtle flex justify-between items-center">
        <h2 className="text-base font-semibold flex items-center gap-2.5">
          <span>📦</span> 제품 정보 입력
        </h2>
        <span className="px-2.5 py-1 bg-[rgba(99,102,241,0.1)] text-accent-primary-hover rounded-full text-[0.7rem]">
          STEP 1
        </span>
      </div>

      {/* 카드 바디 */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[18px]">
          {/* 제품명 (필수) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.8rem] font-medium flex items-center gap-1.5">
              제품명 <span className="text-accent-secondary text-[0.7rem]">*</span>
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, productName: true }))}
              placeholder="예: 허니버터 아몬드 스낵"
              className={`
                w-full py-2.5 px-3.5 bg-bg-tertiary border rounded-[10px]
                text-text-primary font-[inherit] text-sm
                transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]
                focus:outline-none focus:border-accent-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]
                placeholder:text-text-quaternary
                ${isProductNameInvalid ? 'border-accent-danger' : 'border-border-subtle'}
              `}
            />
            {isProductNameInvalid && (
              <p className="text-xs text-accent-danger mt-1">제품명을 입력해주세요</p>
            )}
          </div>

          {/* 카테고리 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.8rem] font-medium flex items-center gap-1.5">
              카테고리
            </label>
            <div className="relative">
              <select
                value={category ?? 'snack'}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="
                  w-full py-2.5 px-3.5 pr-10 bg-bg-tertiary border border-border-subtle rounded-[10px]
                  text-text-primary font-[inherit] text-sm cursor-pointer appearance-none
                  transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]
                  focus:outline-none focus:border-accent-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]
                "
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                }}
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 가격대 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.8rem] font-medium flex items-center gap-1.5">
              가격대
            </label>
            <input
              type="text"
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              placeholder="예: 12,900원"
              className="
                w-full py-2.5 px-3.5 bg-bg-tertiary border border-border-subtle rounded-[10px]
                text-text-primary font-[inherit] text-sm
                transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]
                focus:outline-none focus:border-accent-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]
                placeholder:text-text-quaternary
              "
            />
          </div>

          {/* 타겟 고객 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.8rem] font-medium flex items-center gap-1.5">
              타겟 고객
            </label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="예: 20-30대 직장인"
              className="
                w-full py-2.5 px-3.5 bg-bg-tertiary border border-border-subtle rounded-[10px]
                text-text-primary font-[inherit] text-sm
                transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]
                focus:outline-none focus:border-accent-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]
                placeholder:text-text-quaternary
              "
            />
          </div>

          {/* 제품 특징 / USP (full-width) */}
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-[0.8rem] font-medium flex items-center gap-1.5">
              제품 특징 / USP
            </label>
            <textarea
              value={productFeatures}
              onChange={(e) => setProductFeatures(e.target.value)}
              placeholder="제품의 핵심 특징, 차별점, 장점 등을 상세히 작성해주세요."
              className="
                w-full py-2.5 px-3.5 bg-bg-tertiary border border-border-subtle rounded-[10px]
                text-text-primary font-[inherit] text-sm min-h-[100px] resize-y
                transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]
                focus:outline-none focus:border-accent-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]
                placeholder:text-text-quaternary
              "
            />
          </div>

          {/* 추가 요청사항 (full-width) */}
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-[0.8rem] font-medium flex items-center gap-1.5">
              추가 요청사항
            </label>
            <textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="경쟁사 정보, 특별히 강조하고 싶은 점, 기타 요청사항 등"
              className="
                w-full py-2.5 px-3.5 bg-bg-tertiary border border-border-subtle rounded-[10px]
                text-text-primary font-[inherit] text-sm min-h-[100px] resize-y
                transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]
                focus:outline-none focus:border-accent-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]
                placeholder:text-text-quaternary
              "
            />
          </div>
        </div>
      </div>
    </div>
  );
}
