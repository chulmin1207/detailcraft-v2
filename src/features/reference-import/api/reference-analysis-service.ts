// ===== 섹션별 레퍼런스 분석 서비스 =====
// N장의 레퍼런스를 배치 분석 → 디자인 디렉티브로 종합

import { fetchWithTimeout } from '@/shared/api/instance';
import { compressImageForAPI } from '@/features/image-generation/api/image-service';
import type { SectionType, SectionDesignDirective, SectionReferenceFolder } from '@/shared/types';

interface AnalysisConfig {
  useBackend: boolean;
  backendUrl: string;
  geminiApiKey: string;
}

const BATCH_SIZE = 5;

/**
 * JSON 문자열을 안전하게 파싱. 실패 시 마크다운 코드블록에서 JSON 추출을 시도.
 */
function safeJsonParse(jsonString: string): unknown | null {
  try {
    return JSON.parse(jsonString);
  } catch {
    // Try to extract JSON from markdown code blocks
    const match = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        return JSON.parse(match[1].trim());
      } catch {
        return null;
      }
    }
    return null;
  }
}

const SUPPORTED_RATIOS: [number, number, string][] = [
  [1, 1, '1:1'],
  [3, 4, '3:4'],
  [4, 3, '4:3'],
  [9, 16, '9:16'],
  [16, 9, '16:9'],
  [3, 2, '3:2'],
  [2, 3, '2:3'],
  [5, 4, '5:4'],
  [4, 5, '4:5'],
  [21, 9, '21:9'],
  [1, 4, '1:4'],
  [4, 1, '4:1'],
  [1, 8, '1:8'],
  [8, 1, '8:1'],
];

/**
 * 이미지 data URL을 로드하여 실제 비율을 측정하고 가장 가까운 Gemini 지원 비율을 반환
 */
function measureImageRatio(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (w === 0 || h === 0) {
        resolve('1:1');
        return;
      }
      const actual = w / h;
      let bestRatio = '1:1';
      let bestDiff = Infinity;
      for (const [rw, rh, label] of SUPPORTED_RATIOS) {
        const diff = Math.abs(actual - rw / rh);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestRatio = label;
        }
      }
      resolve(bestRatio);
    };
    img.onerror = () => resolve('1:1');
    img.src = dataUrl;
  });
}

interface BatchAnalysisResult {
  text: string;                  // 원본 분석 텍스트 (디렉티브 종합용)
  imageDescriptions: string[];   // 이미지별 1줄 요약
}

/**
 * 배치 단위로 레퍼런스 이미지를 Gemini Vision으로 분석
 * @returns 배치 분석 결과 (텍스트 + 개별 이미지 설명)
 */
async function analyzeReferenceBatch(
  images: string[],
  sectionType: SectionType,
  batchIndex: number,
  config: AnalysisConfig
): Promise<BatchAnalysisResult> {
  const { useBackend, backendUrl, geminiApiKey } = config;

  const prompt = `당신은 한국 이커머스 상세페이지 디자인 전문가입니다.
아래 ${images.length}장의 레퍼런스 이미지는 "${sectionType}" 유형 섹션의 디자인 참고용입니다.
(배치 ${batchIndex + 1})

각 이미지를 분석하여 JSON으로 응답하세요.

{
  "images": [
    {
      "index": 1,
      "summary": "이 이미지의 핵심 특징 1줄 요약 (제품종류, 분위기, 레이아웃, 색감, 타겟 느낌)",
      "layout": "그리드 구조, 여백, 텍스트-이미지 비율",
      "typography": "서체 스타일, 크기 계층, 강조 방식",
      "colorMood": "색감 분위기, 대비 수준, 포인트 색상",
      "composition": "시선 흐름, 중심-주변 배치, 여백 활용",
      "graphicElements": "뱃지, 아이콘, 구분선, 장식 요소"
    }
  ],
  "bestImageIndex": 1
}

★ summary는 제품 매칭에 사용됩니다. 이미지에 보이는 제품의 종류/카테고리, 전체 분위기(고급/캐주얼/건강/감성), 레이아웃 스타일, 주요 색감을 한 문장으로 작성하세요.
★ 각 필드는 한국어, 간결하게 (1-2문장).
★ JSON만 출력하세요.`;

  const parts: Array<
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }
  > = [{ text: prompt }];

  for (const img of images) {
    const compressed = await compressImageForAPI(img, 500, 0.4);
    const base64Data = compressed.replace(/^data:image\/\w+;base64,/, '');
    parts.push({
      inlineData: { mimeType: 'image/jpeg', data: base64Data },
    });
  }

  const geminiUrl = useBackend
    ? `${backendUrl}/api/gemini`
    : `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiApiKey}`;

  const reqBody: Record<string, unknown> = {
    contents: [{ parts }],
    generationConfig: {
      maxOutputTokens: 3000,
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  };
  if (useBackend) reqBody.model = 'gemini-3-flash-preview';

  const response = await fetchWithTimeout(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reqBody),
  }, 90000);

  const data = await response.json();

  if (!data?.candidates?.[0]?.content?.parts) {
    console.warn(`[analyzeReferenceBatch] ${sectionType} batch ${batchIndex}: 응답 없음`, data?.candidates?.[0]?.finishReason);
    return {
      text: `배치 ${batchIndex + 1}: 분석 데이터 없음 (${images.length}장)`,
      imageDescriptions: images.map(() => '분석 실패'),
    };
  }

  const text = data.candidates[0].content.parts
    .filter((p: { text?: string }) => p.text)
    .map((p: { text: string }) => p.text)
    .join('\n') || '';

  // JSON에서 개별 이미지 설명 추출
  let descriptions: string[] = [];
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    const parsed = safeJsonParse(text.slice(start, end + 1));
    if (parsed && typeof parsed === 'object' && 'images' in (parsed as Record<string, unknown>)) {
      const images = (parsed as { images?: unknown[] }).images;
      if (Array.isArray(images)) {
        descriptions = (images as Array<{ summary?: string }>).map((img) => img.summary || '설명 없음');
      }
    }
    if (descriptions.length === 0) {
      // Fallback: try parsing the full text (may be wrapped in markdown)
      const fallbackParsed = safeJsonParse(text);
      if (fallbackParsed && typeof fallbackParsed === 'object' && 'images' in (fallbackParsed as Record<string, unknown>)) {
        const images = (fallbackParsed as { images?: unknown[] }).images;
        if (Array.isArray(images)) {
          descriptions = (images as Array<{ summary?: string }>).map((img) => img.summary || '설명 없음');
        }
      }
    }
  } else {
    // No braces found — try markdown code block extraction
    const fallbackParsed = safeJsonParse(text);
    if (fallbackParsed && typeof fallbackParsed === 'object' && 'images' in (fallbackParsed as Record<string, unknown>)) {
      const images = (fallbackParsed as { images?: unknown[] }).images;
      if (Array.isArray(images)) {
        descriptions = (images as Array<{ summary?: string }>).map((img) => img.summary || '설명 없음');
      }
    }
    if (descriptions.length === 0) {
      console.warn(`[analyzeReferenceBatch] ${sectionType} batch ${batchIndex}: JSON 파싱 실패, 텍스트 기반 처리`);
    }
  }

  // 설명 개수가 이미지 수와 안 맞으면 패딩
  while (descriptions.length < images.length) {
    descriptions.push('설명 없음');
  }

  return { text, imageDescriptions: descriptions };
}

/**
 * 배치 분석 결과들을 종합하여 디자인 디렉티브를 생성
 */
async function synthesizeDirective(
  batchResults: string[],
  sectionType: SectionType,
  totalRefCount: number,
  config: AnalysisConfig
): Promise<Omit<SectionDesignDirective, 'representativeRefIndices'>> {
  const { useBackend, backendUrl, geminiApiKey } = config;

  const prompt = `당신은 한국 이커머스 상세페이지 디자인 디렉터입니다.
아래는 "${sectionType}" 유형 섹션에 대한 ${totalRefCount}장의 레퍼런스 이미지 분석 결과입니다.

${batchResults.map((r, i) => `=== 배치 ${i + 1} 분석 ===\n${r}`).join('\n\n')}

위 분석을 종합하여, 이 섹션 유형의 **통합 디자인 디렉티브**를 JSON으로 작성하세요.
레퍼런스들의 공통 패턴과 최고 품질 요소를 추출하여 종합합니다.

JSON 형식:
{
  "layoutPatterns": "레이아웃 공통 패턴 종합 (2-3문장)",
  "typographyStyle": "타이포그래피 스타일 종합 (2-3문장)",
  "colorMood": "컬러 무드 종합 - 실제 색상이 아닌 분위기/톤 (2-3문장)",
  "compositionRules": "구도 규칙 종합 (2-3문장)",
  "graphicElements": "그래픽 요소 종합 (2-3문장)",
  "bestBatchIndices": [가장 좋은 이미지가 있는 배치 인덱스 2개 (0부터)]
}

중요: colorMood는 "따뜻한 파스텔톤", "모던 하이콘트라스트" 같은 추상적 무드만 작성.
실제 제품 색상은 별도로 적용되므로 여기서는 무드/톤 방향만 제시하세요.
JSON만 출력하세요.`;

  const geminiUrl = useBackend
    ? `${backendUrl}/api/gemini`
    : `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiApiKey}`;

  const reqBody: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 2000,
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  };
  if (useBackend) reqBody.model = 'gemini-3-flash-preview';

  // 최대 2회 시도
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetchWithTimeout(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
      }, 60000);

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts
        ?.filter((p: { text?: string }) => p.text)
        ?.map((p: { text: string }) => p.text)
        ?.join('') || '';

      if (!text) {
        console.warn(`[synthesizeDirective] ${sectionType}: 빈 응답, finishReason:`, data?.candidates?.[0]?.finishReason);
        if (attempt === 0) continue;
        // 빈 응답이면 기본값 반환
        return {
          sectionType,
          layoutPatterns: '분석 데이터 부족',
          typographyStyle: '분석 데이터 부족',
          colorMood: '분석 데이터 부족',
          compositionRules: '분석 데이터 부족',
          graphicElements: '분석 데이터 부족',
          representativeRefIndices: [0, 0] as [number, number],
          sourceRefCount: totalRefCount,
        };
      }

      // JSON 추출
      let parsed: Record<string, unknown> | null = null;
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        parsed = safeJsonParse(text.slice(start, end + 1)) as Record<string, unknown> | null;
      }
      // Fallback: try parsing full text (may be wrapped in markdown code blocks)
      if (!parsed) {
        parsed = safeJsonParse(text) as Record<string, unknown> | null;
      }
      if (!parsed) {
        console.warn(`[synthesizeDirective] ${sectionType}: JSON 파싱 실패, 원본:`, text.slice(0, 300));
        if (attempt === 0) continue;
        throw new Error(`디렉티브 JSON 파싱 실패 (${sectionType})`);
      }

      const directive = parsed as Record<string, string>;
      return {
        sectionType,
        layoutPatterns: directive.layoutPatterns || '',
        typographyStyle: directive.typographyStyle || '',
        colorMood: directive.colorMood || '',
        compositionRules: directive.compositionRules || '',
        graphicElements: directive.graphicElements || '',
        representativeRefIndices: (parsed as Record<string, unknown>).representativeRefIndices as [number, number] || [0, 0] as [number, number],
        sourceRefCount: totalRefCount,
      };
    } catch (err) {
      console.error(`[synthesizeDirective] ${sectionType} attempt ${attempt + 1} 실패:`, err);
      if (attempt === 1) throw err;
    }
  }

  throw new Error(`디렉티브 생성 실패 (${sectionType})`);

}

/**
 * 대표 레퍼런스 2장을 선별
 * 각 배치에서 가장 좋은 이미지를 비교하여 최종 2장 선택
 */
function selectRepresentativeRefs(
  images: string[],
  batchResults: string[]
): [number, number] {
  // 배치 분석 텍스트에서 "가장 좋은 이미지" 번호를 추출
  const bestPerBatch: number[] = [];

  for (let batchIdx = 0; batchIdx < batchResults.length; batchIdx++) {
    const text = batchResults[batchIdx];
    // "이미지 1", "1번" 등의 패턴에서 번호 추출
    const match = text.match(/(?:가장|최고|품질).*?(?:이미지\s*)?(\d+)/);
    const localIdx = match ? Math.max(0, parseInt(match[1], 10) - 1) : 0;
    const globalIdx = batchIdx * BATCH_SIZE + Math.min(localIdx, BATCH_SIZE - 1);
    if (globalIdx < images.length) {
      bestPerBatch.push(globalIdx);
    }
  }

  // 최소 2개 확보
  if (bestPerBatch.length === 0) {
    return [0, Math.min(1, images.length - 1)];
  }
  if (bestPerBatch.length === 1) {
    const other = bestPerBatch[0] === 0 ? Math.min(1, images.length - 1) : 0;
    return [bestPerBatch[0], other];
  }
  return [bestPerBatch[0], bestPerBatch[1]];
}

export interface AnalysisResult {
  directives: Record<string, SectionDesignDirective>;
  imageDescriptions: Record<string, string[]>;  // 섹션타입 → 이미지별 설명
  imageRatios: Record<string, string[]>;         // 섹션타입 → 이미지별 실측 비율
}

/**
 * 전체 섹션 레퍼런스 분석 파이프라인
 *
 * @param folders 섹션타입별 레퍼런스 이미지 모음
 * @param config API 설정
 * @param onProgress 진행 콜백
 * @returns 섹션타입별 디자인 디렉티브 + 이미지별 설명
 */
export async function analyzeAllSectionReferences(
  folders: Record<string, SectionReferenceFolder>,
  config: AnalysisConfig,
  onProgress?: (current: number, total: number, sectionType: SectionType) => void
): Promise<AnalysisResult> {
  const sectionTypes = Object.keys(folders).filter(
    (k) => folders[k].images.length > 0
  ) as SectionType[];

  const total = sectionTypes.length;
  const directives: Record<string, SectionDesignDirective> = {};
  const imageDescriptions: Record<string, string[]> = {};
  const imageRatios: Record<string, string[]> = {};

  for (let i = 0; i < sectionTypes.length; i++) {
    const sectionType = sectionTypes[i];
    const images = folders[sectionType].images;
    onProgress?.(i + 1, total, sectionType);

    try {
      // 배치 분할
      const batches: string[][] = [];
      for (let j = 0; j < images.length; j += BATCH_SIZE) {
        batches.push(images.slice(j, j + BATCH_SIZE));
      }

      // 배치 분석 (2개씩 병렬)
      const batchResults: BatchAnalysisResult[] = [];
      for (let j = 0; j < batches.length; j += 2) {
        const batchPromises = batches.slice(j, j + 2).map((batch, k) =>
          analyzeReferenceBatch(batch, sectionType, j + k, config)
        );
        const results = await Promise.all(batchPromises);
        batchResults.push(...results);
      }

      // 개별 이미지 설명 수집
      const allDescriptions: string[] = [];
      for (const br of batchResults) {
        allDescriptions.push(...br.imageDescriptions);
      }
      imageDescriptions[sectionType] = allDescriptions;

      // 이미지 비율 측정
      const ratios = await Promise.all(images.map((img) => measureImageRatio(img)));
      imageRatios[sectionType] = ratios;

      // 디렉티브 종합 (텍스트만 전달)
      const batchTexts = batchResults.map((br) => br.text);
      const directive = await synthesizeDirective(
        batchTexts, sectionType, images.length, config
      );

      // 대표 이미지 선별 (기본값, 매칭 시 덮어씌워짐)
      const repIndices = selectRepresentativeRefs(images, batchTexts);

      directives[sectionType] = {
        ...directive,
        representativeRefIndices: repIndices,
      };

    } catch (err) {
      console.error(`[RefAnalysis] ${sectionType}: 실패, 건너뜀`, err);
    }
  }

  return { directives, imageDescriptions, imageRatios };
}

/**
 * 제품 정보 기반 레퍼런스 매칭
 * 각 섹션별로 제품에 가장 어울리는 레퍼런스 2-3장을 선정
 */
export async function matchReferencesToProduct(
  folders: Record<string, SectionReferenceFolder>,
  productInfo: {
    productName: string;
    category: string;
    productFeatures: string;
    targetAudience: string;
    imageAnalysisSummary: string;  // 패키지/원물 분석 요약
  },
  config: AnalysisConfig,
  onProgress?: (current: number, total: number, sectionType: SectionType) => void
): Promise<Record<string, number[]>> {
  const { useBackend, backendUrl, geminiApiKey } = config;

  const sectionTypes = Object.keys(folders).filter(
    (k) => folders[k].images.length > 0 && folders[k].imageDescriptions && folders[k].imageDescriptions?.length > 0
  ) as SectionType[];

  const total = sectionTypes.length;
  const matchedIndices: Record<string, number[]> = {};

  for (let i = 0; i < sectionTypes.length; i++) {
    const sectionType = sectionTypes[i];
    const folder = folders[sectionType];
    const descriptions = folder.imageDescriptions || [];
    onProgress?.(i + 1, total, sectionType);

    const prompt = `당신은 한국 이커머스 상세페이지 디자인 매칭 전문가입니다.

## 제품 정보
- 제품명: ${productInfo.productName}
- 카테고리: ${productInfo.category}
- 제품 특징: ${productInfo.productFeatures}
- 타겟 고객: ${productInfo.targetAudience}
- 패키지/원물 분석: ${productInfo.imageAnalysisSummary}

## "${sectionType}" 섹션 레퍼런스 이미지 목록
${descriptions.map((desc, idx) => `${idx + 1}번: ${desc}`).join('\n')}

위 제품에 가장 어울리는 레퍼런스를 3개 선정하세요.
판단 기준:
1. 제품 카테고리/종류가 비슷한지 (스낵→스낵, 건강식품→건강식품)
2. 분위기/톤이 제품 이미지와 어울리는지 (프리미엄→고급감, 캐주얼→밝고 경쾌)
3. 레이아웃이 이 제품의 정보를 효과적으로 전달할 수 있는지
4. 타겟 고객층에 맞는 디자인인지

JSON으로 응답:
{"matchedIndices": [0-based 인덱스 3개], "reasons": ["선정 이유 1줄씩"]}`;

    try {
      const geminiUrl = useBackend
        ? `${backendUrl}/api/gemini`
        : `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiApiKey}`;

      const reqBody: Record<string, unknown> = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      };
      if (useBackend) reqBody.model = 'gemini-3-flash-preview';

      const response = await fetchWithTimeout(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
      }, 30000);

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts
        ?.filter((p: { text?: string }) => p.text)
        ?.map((p: { text: string }) => p.text)
        ?.join('') || '';

      let parsed: Record<string, unknown> | null = null;
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        parsed = safeJsonParse(text.slice(jsonStart, jsonEnd + 1)) as Record<string, unknown> | null;
      }
      // Fallback: try parsing full text (may be wrapped in markdown code blocks)
      if (!parsed) {
        parsed = safeJsonParse(text) as Record<string, unknown> | null;
      }
      if (parsed) {
        const indices = ((parsed.matchedIndices as number[]) || [])
          .filter((idx: number) => idx >= 0 && idx < descriptions.length)
          .slice(0, 3);

        if (indices.length > 0) {
          matchedIndices[sectionType] = indices;
          continue;
        }
      }
    } catch (err) {
      console.warn(`[RefMatch] ${sectionType}: 매칭 실패`, err);
    }

    // fallback: 첫 2장
    matchedIndices[sectionType] = [0, Math.min(1, descriptions.length - 1)];
  }

  return matchedIndices;
}
