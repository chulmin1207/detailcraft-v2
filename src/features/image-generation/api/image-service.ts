// ===== IMAGE SERVICE (Simplified) =====
// Track 1: Claude 기획 기반 이미지 생성
// Track 2: 섹션 이름만으로 심플 이미지 생성

import type { GenerateImageParams } from '@/shared/types';

// ===== Base64 헬퍼 =====
function safeExtractBase64(dataUrl: string): string {
  const parts = dataUrl.split(',');
  return parts.length > 1 ? parts[1] : dataUrl;
}

// ===== 재시도 헬퍼 =====
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  timeout: number,
  maxRetries = 2,
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      if (response.status === 429 && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 3000));
        continue;
      }
      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 2000));
      }
    }
  }
  throw lastError || new Error('API 요청 실패');
}

// ===== 이미지 압축 =====
export function compressImageForAPI(
  base64: string,
  maxWidth: number = 1280,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = Math.round(height * (maxWidth / width));
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

// ===== 이미지 리사이즈 =====
export function resizeImage(base64: string, targetWidth: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = targetWidth / img.width;
      canvas.width = targetWidth;
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

// ===== Base64 → Blob =====
export function base64ToBlob(base64: string): Blob {
  const parts = base64.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const data = parts.length > 1 ? parts[1] : parts[0];
  const bstr = atob(data);
  const arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) {
    arr[i] = bstr.charCodeAt(i);
  }
  return new Blob([arr], { type: mime });
}

// ===== 시스템 프롬프트 =====
function buildSystemPrompt(productName: string, productFeatures: string): string {
  return `당신은 한국 이커머스 상세페이지 디자인 전문가입니다.

[절대 규칙]
1. 반드시 한국어 텍스트를 정확하게 렌더링하세요
2. 레퍼런스 이미지의 디자인 톤, 색감, 타이포그래피 스타일을 기반으로 하되, 각 섹션마다 레이아웃을 변주하세요
3. 제품 이미지의 패키지 디자인을 정확하게 반영하세요 — 색상, 형태, 텍스트 왜곡 없이
4. 전체 상세페이지가 하나의 톤으로 자연스럽게 이어지도록 톤 & 무드를 일관되게 유지하세요
5. 사람 얼굴 금지 — 손/팔까지만 허용
6. 가짜 인증마크(HACCP, ISO 등), 허위 수치 생성 금지

제품명: ${productName}${productFeatures ? `\n제품 특징: ${productFeatures}` : ''}`;
}

// ===== 통합 이미지 생성 함수 =====
export async function generateSectionImage(
  params: GenerateImageParams
): Promise<{ dataUrl: string; prompt: string }> {
  const {
    section,
    index,
    totalSections,
    modelConfig,
    productImage,
    referenceImage,
    useBackend,
    backendUrl,
    geminiApiKey,
    productName,
    productFeatures,
    track,
  } = params;

  const systemPrompt = buildSystemPrompt(productName, productFeatures);

  let sectionPrompt: string;
  if (track === 'plan' && 'headline' in section && section.headline) {
    // Track 1: Claude 기획 데이터 활용
    sectionPrompt = `[섹션 ${index + 1}/${totalSections} — ${section.name}]

텍스트 내용:
- 헤드라인: ${section.headline}
- 서브카피: ${'subCopy' in section ? section.subCopy : ''}

이 섹션에 맞는 상세페이지 이미지를 만들어주세요.`;
  } else {
    // Track 2: 섹션 이름만
    const label = 'label' in section ? section.label : section.name;
    sectionPrompt = `[섹션 ${index + 1}/${totalSections} — ${label}]
이 섹션에 맞는 상세페이지 이미지를 만들어주세요.`;
  }

  const prompt = systemPrompt + '\n\n' + sectionPrompt;

  // Parts 구성: 프롬프트 → 제품이미지 → 라벨 → 레퍼런스 → 라벨
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  parts.push({ text: prompt });

  // 제품 이미지 (CLI와 동일: 원본 크기 전달)
  if (productImage) {
    parts.push({
      inlineData: { mimeType: 'image/jpeg', data: safeExtractBase64(productImage) },
    });
    parts.push({
      text: '위는 제품 이미지입니다. 이 제품의 패키지 디자인을 정확히 반영하세요. 절대로 다른 제품으로 바꾸거나 색상을 변경하지 마세요.',
    });
  }

  // 레퍼런스 이미지
  if (referenceImage) {
    parts.push({
      inlineData: { mimeType: 'image/jpeg', data: safeExtractBase64(referenceImage) },
    });
    parts.push({
      text: '위는 레퍼런스 디자인입니다. 이 디자인의 톤, 색감, 스타일을 참고하되, 요청된 섹션에 맞게 레이아웃을 변주하세요.',
    });
  }

  // Gemini API 직접 호출 (CLI와 동일한 방식 — 프록시 경유 X)
  // API 키: 파라미터로 받은 키 또는 백엔드에서 가져온 키
  let apiKey = geminiApiKey;
  if (!apiKey && useBackend) {
    // 백엔드에서 API 키 가져오기
    const configRes = await fetch(`${backendUrl}/api/config`);
    if (configRes.ok) {
      const config = await configRes.json() as { geminiKey?: string };
      apiKey = config.geminiKey || '';
    }
  }
  if (!apiKey) throw new Error('Gemini API 키가 없습니다.');

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelConfig.model}:generateContent?key=${apiKey}`;

  const reqBody: Record<string, unknown> = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        ...(modelConfig.config.imageConfig as Record<string, unknown>),
        aspectRatio: '9:16',
      },
    },
  };

  const response = await fetchWithRetry(
    geminiUrl,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
    },
    modelConfig.timeout
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { error?: { message?: string } }).error?.message || `API 오류 (${response.status})`
    );
  }

  const data = await response.json();
  const candidates = (data as {
    candidates?: Array<{
      content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> };
    }>;
  }).candidates || [];

  for (const candidate of candidates) {
    for (const part of (candidate.content?.parts || [])) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        return {
          dataUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
          prompt,
        };
      }
    }
  }

  throw new Error('이미지가 생성되지 않았습니다.');
}
