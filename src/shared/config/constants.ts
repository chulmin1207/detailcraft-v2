import type { ModelConfig, PlatformConfig, SectionType } from '@/shared/types';

export const APP_NAME = 'DetailCraft';

// ===== BACKEND =====
export const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');

// ===== LOCALSTORAGE KEYS =====
export const LS_GEMINI_KEY = 'detailcraft_gemini_key';
export const LS_THEME_KEY = 'detailcraft_theme';

// ===== MODEL =====
export const MODEL_CONFIG: ModelConfig = {
  name: '이미지 생성',
  model: 'gemini-3.1-flash-image-preview',
  timeout: 180000,
  config: { imageConfig: { imageSize: '4K' } },
  description: '4K 해상도',
};

// ===== SECTION TYPE LABELS =====
export const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  hero: '히어로',
  empathy: '공감',
  point: '포인트',
  sizzle: '씨즐컷',
  trust: '신뢰',
  divider: '전환 배너',
  lifestyle: '라이프스타일',
  situation: '상황/TPO',
  review: '리뷰',
  cta: 'CTA',
  spec: '제품 정보',
};

// ===== PLATFORM CONFIGS =====
export const PLATFORM_CONFIGS: PlatformConfig[] = [
  { name: '스마트스토어', folder: 'smartstore_860px', width: 860 },
  { name: '쿠팡', folder: 'coupang_780px', width: 780 },
  { name: '11번가', folder: '11st_800px', width: 800 },
  { name: 'G마켓_옥션', folder: 'gmarket_auction_860px', width: 860 },
];
