import type { ModelConfig, ModelType, PlatformConfig, AspectRatio } from '@/shared/types';

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
export const LS_MODEL_KEY = 'detailcraft_model';
export const LS_ASPECT_RATIO_KEY = 'detailcraft_aspect_ratio';
export const LS_THEME_KEY = 'detailcraft_theme';

// ===== MODEL CONFIGURATIONS =====
export const MODEL_CONFIGS: Record<ModelType, ModelConfig> = {
  fast: {
    name: '🎨 고품질 이미지 생성',
    model: 'gemini-3.1-flash-image-preview',
    timeout: 180000, // 3분
    config: {
      imageConfig: {
        imageSize: '2K',
      },
    },
    description: '나노바나나 2 - 2K 해상도',
  },
  quality: {
    name: '🎨 고품질 이미지 생성',
    model: 'gemini-3.1-flash-image-preview',
    timeout: 180000, // 3분
    config: {
      imageConfig: {
        imageSize: '2K',
      },
    },
    description: '나노바나나 2 - 2K 해상도',
  },
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

// ===== PLATFORM CONFIGURATIONS (다운로드용) =====
export const PLATFORM_CONFIGS: PlatformConfig[] = [
  { name: '스마트스토어', folder: 'smartstore_860px', width: 860 },
  { name: '쿠팡', folder: 'coupang_780px', width: 780 },
  { name: '11번가', folder: '11st_800px', width: 800 },
  { name: 'G마켓_옥션', folder: 'gmarket_auction_860px', width: 860 },
];
