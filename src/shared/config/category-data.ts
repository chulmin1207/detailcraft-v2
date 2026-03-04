import type {
  Category,
  PriceRange,
  CategoryGuideItem,
  ChecklistItem,
  AnalysisData,
} from '@/shared/types';

// ===== CATEGORY GUIDE (buildPlanPrompt에서 사용) =====

export const CATEGORY_GUIDE: Record<Category, CategoryGuideItem> = {
  snack: {
    keywords: '바삭함, 고소함, 달콤함, 짭짤함, 중독성, 간식, 야식, 힐링',
    emotions: '소확행, 나만의 시간, 위로, 행복한 순간',
    painPoints: '살찔까봐 걱정, 건강에 안 좋을까, 양이 적을까',
    trustElements: '원재료 원산지, 무첨가, 전통 방식, 장인 정신',
  },
  beverage: {
    keywords: '청량감, 깔끔함, 시원함, 달콤함, 건강, 에너지',
    emotions: '갈증 해소, 활력 충전, 휴식, 리프레시',
    painPoints: '당분 걱정, 카페인 부작용, 인공 첨가물',
    trustElements: '천연 원료, 무설탕, 저칼로리, 유기농 인증',
  },
  instant: {
    keywords: '간편함, 빠름, 맛있음, 든든함, 실속',
    emotions: '바쁜 일상 속 여유, 혼밥의 즐거움, 자취 필수템',
    painPoints: '맛없을까봐, 영양 불균형, 나트륨 걱정',
    trustElements: 'HACCP, 국내산 재료, 유명 셰프 레시피',
  },
  health: {
    keywords: '건강, 활력, 면역력, 피로회복, 영양보충',
    emotions: '건강한 미래, 가족 건강, 자기관리, 투자',
    painPoints: '효과 있을까, 부작용 걱정, 가격 대비 효과',
    trustElements: '식약처 인증, 임상시험, 특허 성분, 전문가 추천',
  },
  beauty: {
    keywords: '피부결, 광채, 탄력, 보습, 안티에이징',
    emotions: '자신감, 아름다움, 관리받는 느낌, 럭셔리',
    painPoints: '피부 트러블, 효과 체감 시간, 성분 안전성',
    trustElements: '피부과 테스트, 천연 성분, 비건, 무자극',
  },
  living: {
    keywords: '편리함, 실용성, 공간활용, 청결, 효율',
    emotions: '깔끔한 집, 스마트한 생활, 시간 절약',
    painPoints: '내구성, 실제 사용성, 공간 차지',
    trustElements: 'KC인증, AS보장, 사용 후기, 품질 보증',
  },
  other: {
    keywords: '품질, 가치, 만족, 신뢰',
    emotions: '만족감, 현명한 선택, 가성비',
    painPoints: '품질 걱정, 가격 대비 가치, 필요성',
    trustElements: '품질 인증, 고객 후기, 브랜드 신뢰도',
  },
};

// 가격대별 전략
export const PRICE_STRATEGY: Record<Exclude<PriceRange, ''>, string> = {
  budget: '가성비 강조, 실속 있는 선택, 부담 없는 가격',
  mid: '합리적인 가격, 품질과 가격의 균형, 현명한 소비',
  premium: '프리미엄 가치, 투자할 만한 이유, 차별화된 경험',
  luxury: '최고급 품질, 특별한 경험, 나를 위한 선물',
};

// 카테고리 데이터 조회 헬퍼
export function getCategoryData(category: Category): CategoryGuideItem {
  return CATEGORY_GUIDE[category] || CATEGORY_GUIDE['other'];
}

// 가격 전략 메시지 조회 헬퍼
export function getPriceMessage(priceRange: PriceRange): string {
  if (!priceRange) return PRICE_STRATEGY['mid'];
  return PRICE_STRATEGY[priceRange] || PRICE_STRATEGY['mid'];
}

// ===== CHECKLIST DATA =====

interface CategoryChecklistEntry {
  name: string;
  icon: string;
  items: Omit<ChecklistItem, 'check'>[];
}

export const CATEGORY_CHECKLISTS: Record<Category, CategoryChecklistEntry> = {
  snack: {
    name: '스낵/과자/제과',
    icon: '🍪',
    items: [
      { id: 'nutrition', label: '영양정보 표기', detail: '칼로리, 단백질, 탄수화물 등' },
      { id: 'ingredients', label: '원재료 명시', detail: '주요 원재료 및 알레르기 정보' },
      { id: 'taste', label: '맛 표현', detail: '맛을 느낄 수 있는 감각적 표현' },
      { id: 'texture', label: '식감 표현', detail: '바삭, 쫀득 등 식감 묘사' },
      { id: 'certification', label: 'HACCP/인증마크', detail: '식품안전 인증 표기' },
    ],
  },
  beverage: {
    name: '음료/주류',
    icon: '🥤',
    items: [
      { id: 'volume', label: '용량 표기', detail: 'ml, L 등 정확한 용량' },
      { id: 'nutrition', label: '영양정보', detail: '칼로리, 당류 등' },
      { id: 'storage', label: '보관방법', detail: '냉장/상온 보관 안내' },
      { id: 'taste', label: '맛 표현', detail: '상쾌함, 달콤함 등' },
      { id: 'caffeine', label: '카페인/알코올 함량', detail: '해당 시 표기' },
    ],
  },
  instant: {
    name: '즉석식품/간편식',
    icon: '🍱',
    items: [
      { id: 'ingredients', label: '원재료/원산지', detail: '주요 원재료 및 원산지' },
      { id: 'nutrition', label: '영양정보', detail: '영양성분 표시' },
      { id: 'expiry', label: '유통기한', detail: '소비기한/유통기한 안내' },
      { id: 'storage', label: '보관방법', detail: '냉장/냉동/실온' },
      { id: 'cooking', label: '조리방법', detail: '전자레인지, 끓는물 등' },
    ],
  },
  health: {
    name: '건강식품/보충제',
    icon: '💊',
    items: [
      { id: 'dosage', label: '섭취방법', detail: '1일 섭취량, 섭취 시기' },
      { id: 'ingredients', label: '기능성 원료', detail: '주요 성분 및 함량' },
      { id: 'certification', label: '인증마크', detail: '건강기능식품 인증' },
      { id: 'caution', label: '주의사항', detail: '섭취 시 주의할 점' },
      { id: 'effects', label: '기능성 표시', detail: '기대 효과 설명' },
    ],
  },
  beauty: {
    name: '뷰티/화장품',
    icon: '💄',
    items: [
      { id: 'ingredients', label: '전성분 표기', detail: '화장품 전성분' },
      { id: 'usage', label: '사용법 안내', detail: '사용 순서 및 방법' },
      { id: 'skintype', label: '피부타입 명시', detail: '적합한 피부타입' },
      { id: 'volume', label: '용량/중량', detail: 'ml, g 등 정확한 표기' },
      { id: 'certification', label: '식약처 인증', detail: '화장품 안전 기준' },
    ],
  },
  living: {
    name: '생활용품',
    icon: '🧴',
    items: [
      { id: 'spec', label: '제품 규격', detail: '사이즈, 용량 등' },
      { id: 'material', label: '소재/성분', detail: '주요 재질 및 성분' },
      { id: 'usage', label: '사용방법', detail: '올바른 사용법' },
      { id: 'caution', label: '주의사항', detail: '안전 주의사항' },
      { id: 'certification', label: 'KC인증/안전인증', detail: '안전 인증 표기' },
    ],
  },
  other: {
    name: '기타',
    icon: '📦',
    items: [
      { id: 'spec', label: '제품 규격', detail: '사이즈, 무게 등' },
      { id: 'material', label: '소재/재질', detail: '제품 소재 정보' },
      { id: 'usage', label: '사용방법', detail: '사용법 안내' },
      { id: 'caution', label: '주의사항', detail: '사용 시 주의점' },
      { id: 'warranty', label: 'A/S 안내', detail: '보증 및 서비스' },
    ],
  },
};

export const COMMON_CHECKLIST: Record<string, {
  name: string;
  icon: string;
  items: ChecklistItem[];
}> = {
  copy: {
    name: '카피라이팅',
    icon: '📝',
    items: [
      { id: 'headline_length', label: '헤드라인 적정 길이', detail: '15자 이내 권장', check: (data: AnalysisData) => data.headlineAvgLength <= 15 },
      { id: 'headline_impact', label: '헤드라인 임팩트', detail: '관심을 끄는 문구', check: (data: AnalysisData) => data.hasImpactWords },
      { id: 'cta_exists', label: 'CTA 문구 존재', detail: '구매 유도 문구', check: (data: AnalysisData) => data.hasCTA },
      { id: 'product_name', label: '제품명 명확', detail: '제품명이 잘 드러남', check: (data: AnalysisData) => data.productNameClear },
    ],
  },
  visual: {
    name: '비주얼',
    icon: '🖼️',
    items: [
      { id: 'product_image', label: '제품 이미지 포함', detail: '실제 제품 사진', check: (data: AnalysisData) => data.hasProductImage },
      { id: 'section_count', label: '충분한 섹션 수', detail: '6개 이상 권장', check: (data: AnalysisData) => data.sectionCount >= 6 },
      { id: 'package_image', label: '패키지 이미지', detail: '포장 디자인 노출', check: (data: AnalysisData) => data.hasPackageImage },
    ],
  },
  trust: {
    name: '신뢰 요소',
    icon: '🛡️',
    items: [
      { id: 'review_section', label: '리뷰/후기 섹션', detail: '고객 후기 영역', check: (data: AnalysisData) => data.hasReviewSection },
      { id: 'price_info', label: '가격 정보', detail: '가격 명시 여부', check: (data: AnalysisData) => data.hasPriceInfo },
    ],
  },
};
