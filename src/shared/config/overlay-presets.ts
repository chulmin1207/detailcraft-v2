// ===== 섹션별 텍스트 오버레이 프리셋 =====
// AI 생성 이미지 위에 정확한 한글 텍스트를 HTML/CSS로 오버레이

import type { CSSProperties } from 'react';

export interface OverlayPreset {
  layout: 'center' | 'bottom' | 'top';
  gradient: string;
  headline: CSSProperties;
  subCopy: CSSProperties;
  padding: string;
}

const BASE_HEADLINE: CSSProperties = {
  fontFamily: "'Noto Sans KR', sans-serif",
  fontWeight: 900,
  color: '#FFFFFF',
  textShadow: '0 2px 8px rgba(0,0,0,0.6)',
  lineHeight: 1.3,
  marginBottom: '0.4rem',
};

const BASE_SUBCOPY: CSSProperties = {
  fontFamily: "'Noto Sans KR', sans-serif",
  fontWeight: 400,
  color: 'rgba(255,255,255,0.9)',
  textShadow: '0 1px 4px rgba(0,0,0,0.4)',
  lineHeight: 1.5,
};

const PRESETS: Record<number, Partial<OverlayPreset>> = {
  1: {
    layout: 'center',
    headline: { ...BASE_HEADLINE, fontSize: '2rem', textAlign: 'center' },
    subCopy: { ...BASE_SUBCOPY, fontSize: '1rem', textAlign: 'center' },
  },
  8: {
    layout: 'center',
    headline: { ...BASE_HEADLINE, fontSize: '1.8rem', textAlign: 'center' },
    subCopy: { ...BASE_SUBCOPY, fontSize: '0.95rem', textAlign: 'center' },
  },
};

const DEFAULT: OverlayPreset = {
  layout: 'bottom',
  gradient: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)',
  headline: { ...BASE_HEADLINE, fontSize: '1.6rem' },
  subCopy: { ...BASE_SUBCOPY, fontSize: '0.9rem' },
  padding: '1.5rem',
};

export function getOverlayPreset(sectionNumber: number): OverlayPreset {
  const override = PRESETS[sectionNumber];
  if (!override) return DEFAULT;
  return {
    ...DEFAULT,
    ...override,
    headline: { ...DEFAULT.headline, ...override.headline },
    subCopy: { ...DEFAULT.subCopy, ...override.subCopy },
  };
}
