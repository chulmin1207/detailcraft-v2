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
  return `당신은 프리미엄 상세페이지 디자이너입니다.

[디자인 원칙]
1. 각 섹션에 사진/이미지는 최대 1~2장만 사용하세요. 이미지를 많이 넣지 마세요.
2. 기본 구조: 텍스트(상단) → 이미지(중앙~하단)
3. 이미지 외에는 그래픽 요소(아이콘, 배지, 라인, 도형 등)와 텍스트 디자인으로 채우세요
4. 텍스트 디자인이 핵심: 굵은 헤드라인, 서브텍스트, 강조색, 배지 등으로 시각적 임팩트
5. 여백을 충분히 활용하세요

[레퍼런스 활용 규칙 — 75:25]
- 톤 레퍼런스: 색감, 배경색, 타이포그래피 톤을 모든 섹션에 동일하게 적용
- 레이아웃 레퍼런스: 레이아웃 구조와 정보 배치를 참고하되 세부 배치는 변주
- 같은 디자이너가 다른 브랜드로 만든 느낌으로 — 구조 75% 유지 + 색상/세부 25% 변주
- 레퍼런스를 그대로 복사하지 마세요

[절대 규칙]
1. 반드시 한국어 텍스트를 정확하게 렌더링하세요
2. 제품 이미지의 패키지 디자인을 정확하게 반영하세요 — 색상, 형태, 텍스트 왜곡 없이
3. 사람 얼굴 금지 — 손/팔까지만 허용
4. 가짜 인증마크(HACCP, ISO 등), 허위 수치 생성 금지
5. 제품에 실제 있는 정보만 사용하세요. 없는 정보를 지어내지 마세요.

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
    toneReferenceImage,
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

  // 제품 이미지 (원본 그대로 — CLI와 동일)
  if (productImage) {
    parts.push({
      inlineData: { mimeType: 'image/jpeg', data: safeExtractBase64(productImage) },
    });
    parts.push({
      text: '위는 제품 이미지입니다. 이 제품의 패키지 디자인을 정확히 반영하세요. 절대로 다른 제품으로 바꾸거나 색상을 변경하지 마세요.',
    });
  }

  // 톤 레퍼런스 (색감/타이포 톤 — 전 섹션 동일 적용)
  if (toneReferenceImage) {
    parts.push({
      inlineData: { mimeType: 'image/jpeg', data: safeExtractBase64(toneReferenceImage) },
    });
    parts.push({
      text: '위는 톤/색감 레퍼런스입니다. 이 이미지의 배경색, 타이포그래피 색상, 전체적인 톤을 모든 섹션에 동일하게 적용하세요.',
    });
  }

  // 레이아웃 레퍼런스 (구조/배치 참고 — 섹션별로 다를 수 있음)
  if (referenceImage) {
    parts.push({
      inlineData: { mimeType: 'image/jpeg', data: safeExtractBase64(referenceImage) },
    });
    parts.push({
      text: '위는 레이아웃 레퍼런스입니다. 이 디자인의 레이아웃 구조와 정보 배치를 참고하되, 색상/톤은 톤 레퍼런스를 따르세요. 같은 디자이너가 다른 브랜드로 만든 느낌으로 자연스럽게 변주하세요.',
    });
  }

  // Gemini API 직접 호출 (헤더에 키 — URL 노출 방지)
  let apiKey = geminiApiKey;
  if (!apiKey && useBackend) {
    const configRes = await fetch(`${backendUrl}/api/config`);
    if (configRes.ok) {
      const config = await configRes.json() as { geminiKey?: string };
      apiKey = config.geminiKey || '';
    }
  }
  if (!apiKey) throw new Error('Gemini API 키가 없습니다.');

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelConfig.model}:generateContent`;

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
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
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

// ===== 이미지 수정 함수 (원본 기반) =====
export async function editSectionImage(params: {
  originalImage: string;
  editInstruction: string;
  modelConfig: { model: string; timeout: number; config: Record<string, unknown> };
  useBackend: boolean;
  backendUrl: string;
  geminiApiKey: string;
}): Promise<{ dataUrl: string }> {
  const { originalImage, editInstruction, modelConfig, useBackend, backendUrl, geminiApiKey } = params;

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  // 원본 이미지 (그대로 전송 — 품질 유지)
  parts.push({
    inlineData: { mimeType: 'image/jpeg', data: safeExtractBase64(originalImage) },
  });
  parts.push({
    text: `위 이미지는 이커머스 상세페이지 섹션 이미지입니다.
이 이미지를 기반으로 아래 수정 요청을 반영해주세요.
원본의 전체적인 톤, 레이아웃, 스타일은 최대한 유지하면서 요청된 부분만 수정하세요.

[수정 요청]
${editInstruction}`,
  });

  // API 키 (헤더 방식)
  let apiKey = geminiApiKey;
  if (!apiKey && useBackend) {
    const configRes = await fetch(`${backendUrl}/api/config`);
    if (configRes.ok) {
      const config = await configRes.json() as { geminiKey?: string };
      apiKey = config.geminiKey || '';
    }
  }
  if (!apiKey) throw new Error('Gemini API 키가 없습니다.');

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelConfig.model}:generateContent`;

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
    { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, body: JSON.stringify(reqBody) },
    modelConfig.timeout,
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error((error as { error?: { message?: string } }).error?.message || `API 오류 (${response.status})`);
  }

  const data = await response.json();
  const candidates = (data as {
    candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> } }>;
  }).candidates || [];

  for (const candidate of candidates) {
    for (const part of (candidate.content?.parts || [])) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        return { dataUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` };
      }
    }
  }
  throw new Error('수정된 이미지가 생성되지 않았습니다.');
}
