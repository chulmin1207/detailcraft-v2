import type { FixedSection } from '@/shared/types';

/** 13개 고정 섹션 정의 */
export const FIXED_SECTIONS: FixedSection[] = [
  { number: 1, name: '히어로', sectionType: 'hero', label: '히어로 (브랜드 첫인상)' },
  { number: 2, name: '공감', sectionType: 'empathy', label: '공감 (고객 고민)' },
  { number: 3, name: '포인트 01', sectionType: 'point', label: '포인트 01 (핵심 셀링포인트)' },
  { number: 4, name: '포인트 02', sectionType: 'point', label: '포인트 02 (핵심 셀링포인트)' },
  { number: 5, name: '포인트 03', sectionType: 'point', label: '포인트 03 (핵심 셀링포인트)' },
  { number: 6, name: '씨즐컷', sectionType: 'sizzle', label: '씨즐컷 (식욕 자극 클로즈업)' },
  { number: 7, name: '신뢰', sectionType: 'trust', label: '신뢰 (원재료/품질)' },
  { number: 8, name: '전환 배너', sectionType: 'divider', label: '전환 배너' },
  { number: 9, name: '라이프스타일', sectionType: 'lifestyle', label: '라이프스타일 (일상 속 활용)' },
  { number: 10, name: '상황/TPO', sectionType: 'situation', label: '상황/TPO (다양한 즐기는 방법)' },
  { number: 11, name: '리뷰', sectionType: 'review', label: '리뷰 (고객 후기)' },
  { number: 12, name: 'CTA', sectionType: 'cta', label: 'CTA (구매 유도)' },
  { number: 13, name: '제품 정보', sectionType: 'spec', label: '제품 정보 (스펙/영양성분)' },
];
