import type { ModelConfig, PlatformConfig, AspectRatio, SectionType } from '@/shared/types';

// ===== APP CONSTANTS =====
export const APP_NAME = 'DetailCraft V2';
export const ROUTES = {
  HOME: '/',
  ABOUT: '/about',
} as const;

// ===== BACKEND & AUTH CONSTANTS =====
export const BACKEND_URL = 'https://detailcraft-backend.vercel.app';
export const AUTH_TOKEN_KEY = 'detailcraft_auth_token';
export const AUTH_USER_KEY = 'detailcraft_auth_user';

// ===== LOCALSTORAGE KEYS =====
export const LS_CLAUDE_KEY = 'detailcraft_claude_key';
export const LS_GEMINI_KEY = 'detailcraft_gemini_key';
export const LS_ASPECT_RATIO_KEY = 'detailcraft_aspect_ratio';
export const LS_THEME_KEY = 'detailcraft_theme';

// ===== MODEL CONFIGURATION =====
export const MODEL_CONFIG: ModelConfig = {
  name: '🎨 이미지 생성',
  model: 'gemini-3.1-flash-image-preview',
  timeout: 180000,
  config: {
    imageConfig: {
      imageSize: '2K',
    },
  },
  description: '2K 해상도',
};

// 동적으로 aspectRatio 포함한 config 반환
export function getModelConfigWithRatio(
  baseConfig: Record<string, unknown>,
  selectedAspectRatio: AspectRatio,
): Record<string, unknown> {
  const config = { ...baseConfig };
  const existingImageConfig = config.imageConfig as Record<string, unknown> | undefined;

  if (existingImageConfig) {
    config.imageConfig = { ...existingImageConfig, aspectRatio: selectedAspectRatio };
  } else {
    config.imageConfig = { aspectRatio: selectedAspectRatio };
  }

  return config;
}

// ===== SECTION TYPE LABELS =====
export const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  'hero': '히어로',
  'empathy': '공감',
  'point': '포인트',
  'trust': '신뢰/인증',
  'divider': '전환 브릿지',
  'lifestyle': '라이프스타일',
  'situation': '상황/타겟',
  'recipe': '사용법/레시피',
  'review': '리뷰',
  'faq': 'FAQ',
  'sizzle': '씨즐컷',
  'cta': 'CTA',
  'spec': '제품 정보',
  'bundle': '묶음 구성',
  'flavor': '맛/플레이버',
  'closeup': '원재료 클로즈업',
  'lineup': '제품 라인업',
  'product-cut': '제품 단독컷',
};

// ===== PLATFORM CONFIGURATIONS (다운로드용) =====
export const PLATFORM_CONFIGS: PlatformConfig[] = [
  { name: '스마트스토어', folder: 'smartstore_860px', width: 860 },
  { name: '쿠팡', folder: 'coupang_780px', width: 780 },
  { name: '11번가', folder: '11st_800px', width: 800 },
  { name: 'G마켓_옥션', folder: 'gmarket_auction_860px', width: 860 },
];
