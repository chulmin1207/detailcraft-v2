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
  return `당신은 이커머스 상세페이지 이미지 전문가입니다.

[핵심 규칙]
1. 텍스트/글자를 이미지에 절대 넣지 마세요. 순수 비주얼 이미지만 생성하세요. 헤드라인, 서브카피, 라벨, 숫자, 뱃지 텍스트 등 모든 문자를 제외하세요.
2. 레퍼런스 이미지의 톤, 색감, 분위기를 기반으로 하되 레이아웃을 변주하세요
3. 제품 이미지의 패키지를 정확히 반영 — 색상, 형태 왜곡 없이
4. 전체 톤 & 무드를 일관되게 유지하세요
5. 사람 얼굴 금지 — 손/팔까지만 허용
6. 가짜 인증마크, 허위 수치 금지
7. 실사 사진 스타일만. 일러스트, 카툰, 클립아트 금지

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
    referenceImages,
    toneReferenceImages,
    useBackend,
    backendUrl,
    geminiApiKey,
    productName,
    productFeatures,
    track,
    aspectRatio,
  } = params;

  const productInfoJson = params.productInfoJson;

  // JSON 프롬프트가 있으면 영문 프롬프트 조합, 없으면 기존 한글 방식
  let prompt: string;

  if (track === 'plan' && 'promptJson' in section && section.promptJson) {
    const pj = section.promptJson;
    const pi = productInfoJson;

    // 영문 프롬프트 조합 (JSON 기반)
    prompt = `Based on the provided reference images. Professional product photography of ${pi?.name || productName}.

Composition: ${pj.fromReference.composition}
Camera angle: ${pj.fromReference.cameraAngle}
Lighting: ${pj.fromReference.lighting}
Product occupancy: ${pj.fromReference.productOccupancy}
Negative space: ${pj.fromReference.negativeSpace}

Background: ${pj.adaptedForProduct.backgroundColor}
Props: ${pj.adaptedForProduct.props.join(', ') || 'none'}
Tone/mood: ${pj.adaptedForProduct.toneMood}
Color palette: ${pj.adaptedForProduct.colorPalette}

${pj.scaleRules ? `Scale rules: ${pj.scaleRules}` : ''}
${pj.additionalDirections ? `Additional: ${pj.additionalDirections}` : ''}

The product packaging design must remain strictly unchanged. ${pj.packageIntegrity}
${pj.frontMarkings ? `Do not warp the Product Package Front Statement Markings: ${pj.frontMarkings}` : ''}

No text, no labels, no headlines in the image. Pure visual only.
No illustrations, no cartoons, no clipart. Realistic photography only.
No human faces — hands and arms only.
No fake certification marks or fabricated data.
Ultra high resolution, commercial quality.`;
  } else {
    // 기존 방식 (Track 2 또는 JSON 없는 경우)
    const systemPrompt = buildSystemPrompt(productName, productFeatures);
    let sectionPrompt: string;
    if (track === 'plan' && 'headline' in section && section.headline) {
      sectionPrompt = `[${section.name}]
이 섹션에 맞는 상세페이지 이미지를 만들어주세요.`;
    } else {
      const label = 'label' in section ? section.label : section.name;
      sectionPrompt = `[${label}]
이 섹션에 맞는 상세페이지 이미지를 만들어주세요.`;
    }
    prompt = systemPrompt + '\n\n' + sectionPrompt;
  }

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

  // 톤 레퍼런스 (색감/타이포 톤 — 전 섹션 동일 적용, 복수 지원)
  const validToneRefs = toneReferenceImages.filter(Boolean);
  if (validToneRefs.length > 0) {
    for (const toneRef of validToneRefs) {
      parts.push({
        inlineData: { mimeType: 'image/jpeg', data: safeExtractBase64(toneRef) },
      });
    }
    parts.push({
      text: `위 ${validToneRefs.length}장은 톤/색감 레퍼런스입니다. 이 이미지들의 배경색, 타이포그래피 색상, 전체적인 톤을 종합적으로 참고하여 모든 섹션에 동일하게 적용하세요.`,
    });
  }

  // 레이아웃 레퍼런스 (구조/배치 참고, 복수 지원)
  const validLayoutRefs = referenceImages.filter(Boolean);
  if (validLayoutRefs.length > 0) {
    for (const layoutRef of validLayoutRefs) {
      parts.push({
        inlineData: { mimeType: 'image/jpeg', data: safeExtractBase64(layoutRef) },
      });
    }
    parts.push({
      text: `위 ${validLayoutRefs.length}장은 레이아웃 레퍼런스입니다. 현재 섹션의 내용에 가장 유사한 구도를 가진 1~2장을 골라 레이아웃 구조, 여백, 정보 배치 방식을 참고하세요. 색상/톤은 톤 레퍼런스를 따르세요.`,
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
        aspectRatio: aspectRatio || '3:4',
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
        aspectRatio: aspectRatio || '3:4',
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
