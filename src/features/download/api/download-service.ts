// ===== DOWNLOAD SERVICE =====
// 이미지 다운로드 및 ZIP 생성 서비스 (순수 함수, DOM 접근 최소화)

import { resizeImage, base64ToBlob } from '@/features/image-generation/api/image-service';
import type { GeneratedImage, PlatformConfig, Section } from '@/shared/types';

// ===== PLATFORM CONFIGURATIONS =====
const PLATFORM_CONFIGS: PlatformConfig[] = [
  { name: '스마트스토어', folder: 'smartstore_860px', width: 860 },
  { name: '쿠팡', folder: 'coupang_780px', width: 780 },
  { name: '11번가', folder: '11st_800px', width: 800 },
  { name: 'G마켓_옥션', folder: 'gmarket_auction_860px', width: 860 },
];

// ===== 전체 이미지 다운로드 (ZIP) =====
export async function downloadAllImages(
  generatedImages: Record<number, GeneratedImage>,
  generatedSections: Section[],
  productName: string
): Promise<{ imageCount: number; platformCount: number }> {
  const images = Object.entries(generatedImages)
    .filter(([, img]) => img && !img.error)
    .map(([i, img]) => ({
      name: `section-${generatedSections[Number(i)].number}-${generatedSections[Number(i)].name.replace(/[^a-zA-Z0-9가-힣]/g, '_')}.png`,
      data: img.data,
    }));

  if (images.length === 0) {
    throw new Error('다운로드할 이미지가 없습니다.');
  }

  // JSZip 라이브러리 동적 import
  const JSZip = (await import('jszip')).default;

  const zip = new JSZip();
  // 플랫폼별로 폴더 생성 및 리사이즈된 이미지 추가
  for (const platform of PLATFORM_CONFIGS) {
    const folder = zip.folder(platform.folder)!;

    for (const img of images) {
      let resizedData: string;
      try {
        resizedData = await resizeImage(img.data, platform.width);
      } catch {
        resizedData = img.data; // fallback to original
      }
      const blob = base64ToBlob(resizedData);
      folder.file(img.name, blob);
    }
  }

  // ZIP 파일 생성 및 다운로드
  const content = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const safeName = (productName || 'product').replace(/[^a-zA-Z0-9가-힣]/g, '_');
  const timestamp = new Date().toISOString().slice(0, 10);

  const link = document.createElement('a');
  link.href = URL.createObjectURL(content);
  link.download = `${safeName}_상세페이지_${timestamp}.zip`;
  link.click();
  URL.revokeObjectURL(link.href);

  return {
    imageCount: images.length,
    platformCount: PLATFORM_CONFIGS.length,
  };
}

// ===== 단일 이미지 다운로드 =====
export function downloadSingle(
  index: number,
  generatedImages: Record<number, GeneratedImage>,
  generatedSections: Section[]
): void {
  const img = generatedImages[index];
  if (!img || img.error) return;

  const section = generatedSections[index];
  const link = document.createElement('a');
  link.href = img.data;
  link.download = `section-${section.number}-${section.name.replace(/[^a-zA-Z0-9가-힣]/g, '_')}.png`;
  link.click();
}

// ===== 파일 다운로드 유틸리티 =====
export function downloadFile(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
