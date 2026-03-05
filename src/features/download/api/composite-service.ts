// ===== 이미지 + 텍스트 합성 서비스 =====
// AI 생성 이미지 위에 한글 텍스트를 오버레이한 합성 이미지를 생성

import html2canvas from 'html2canvas';
import { getOverlayPreset } from '@/shared/config/overlay-presets';
import type { Section } from '@/shared/types';

/** 이미지의 자연 크기를 가져온다 */
function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/** rem 값을 targetWidth에 비례하여 px로 변환 (미리보기 ~300px 기준) */
function scaleFontSize(remValue: string | number | undefined, targetWidth: number): string {
  if (!remValue) return '16px';
  const rem = typeof remValue === 'string' ? parseFloat(remValue) : remValue;
  if (isNaN(rem)) return '16px';
  const basePx = rem * 16; // 1rem = 16px
  const scale = targetWidth / 300; // 미리보기 기준 ~300px
  return `${Math.round(basePx * scale * 0.55)}px`; // 감쇠 계수
}

/** camelCase → kebab-case 변환 */
function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

/** CSSProperties를 DOM element에 적용 + 폰트 크기 스케일링 */
function applyStylesToElement(
  el: HTMLElement,
  styles: Record<string, unknown>,
  targetWidth: number
): void {
  for (const [key, value] of Object.entries(styles)) {
    if (key === 'fontSize') {
      el.style.setProperty(camelToKebab(key), scaleFontSize(value as string, targetWidth));
    } else if (typeof value === 'string' || typeof value === 'number') {
      el.style.setProperty(camelToKebab(key), String(value));
    }
  }
}

/**
 * AI 생성 이미지 + 한글 텍스트를 합성하여 단일 이미지로 렌더링
 *
 * @param imageDataUrl - AI 생성 이미지 dataUrl
 * @param section - 섹션 데이터 (headline, subCopy 등)
 * @param targetWidth - 출력 이미지 너비 (px)
 * @returns 합성된 이미지 dataUrl (PNG)
 */
export async function renderComposite(
  imageDataUrl: string,
  section: Section,
  targetWidth: number
): Promise<string> {
  // 1. 이미지 원본 크기 → 비율 계산
  const dims = await getImageDimensions(imageDataUrl);
  const aspectRatio = dims.height / dims.width;
  const targetHeight = Math.round(targetWidth * aspectRatio);

  // 2. 오프스크린 컨테이너 생성
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed; left: -9999px; top: 0; z-index: -1;
    width: ${targetWidth}px; height: ${targetHeight}px;
    overflow: hidden;
  `;

  // 3. 배경 이미지
  const imgEl = document.createElement('img');
  imgEl.src = imageDataUrl;
  imgEl.style.cssText = `width: 100%; height: 100%; object-fit: cover; display: block;`;
  imgEl.crossOrigin = 'anonymous';
  container.appendChild(imgEl);

  // 4. 텍스트 오버레이
  const preset = getOverlayPreset(section.number);
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: absolute; inset: 0;
    display: flex; flex-direction: column;
    justify-content: ${preset.layout === 'center' ? 'center' : 'flex-end'};
    align-items: ${preset.layout === 'center' ? 'center' : 'flex-start'};
    background: ${preset.gradient};
    padding: ${Math.round(targetWidth * 0.04)}px;
  `;
  container.style.position = 'relative';

  if (section.headline) {
    const h = document.createElement('div');
    applyStylesToElement(h, preset.headline as Record<string, unknown>, targetWidth);
    h.textContent = section.headline;
    overlay.appendChild(h);
  }

  if (section.subCopy) {
    const p = document.createElement('div');
    applyStylesToElement(p, preset.subCopy as Record<string, unknown>, targetWidth);
    p.textContent = section.subCopy;
    overlay.appendChild(p);
  }

  container.appendChild(overlay);

  // 5. DOM에 추가 + 이미지 로드 대기
  document.body.appendChild(container);
  await imgEl.decode().catch(() => {});
  await document.fonts.ready;

  // 6. html2canvas로 캡처
  const canvas = await html2canvas(container, {
    width: targetWidth,
    height: targetHeight,
    scale: 1,
    useCORS: true,
    logging: false,
    backgroundColor: null,
  });

  // 7. 정리 + 반환
  document.body.removeChild(container);
  return canvas.toDataURL('image/png');
}
