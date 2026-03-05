// ===== VISION ANALYSIS SERVICE =====
// 제품/패키지 + 레퍼런스 이미지를 통합 분석하여 DesignBrief 생성

import { fetchWithTimeout } from '@/shared/api/instance';
import { compressImageForAPI } from '@/features/image-generation/api/image-service';
import type { UploadedImages, DesignBrief } from '@/shared/types';

interface AnalysisConfig {
  useBackend: boolean;
  backendUrl: string;
  geminiApiKey: string;
}

/**
 * 모든 업로드 이미지를 통합 분석하여 DesignBrief를 생성한다.
 * - 제품/패키지 이미지(A): 최대 3+2=5장
 * - 레퍼런스 이미지(B): 최대 5장
 * - 총 최대 10장을 Gemini 2.5 Flash 비전으로 분석
 */
export async function analyzeAllImages(
  images: UploadedImages,
  config: AnalysisConfig
): Promise<DesignBrief | null> {
  const { useBackend, backendUrl, geminiApiKey } = config;

  // 이미지 수집 (A: 제품/패키지, B: 레퍼런스)
  const productImages = images.product.slice(0, 3);
  const packageImages = images.package.slice(0, 2);
  const referenceImages = images.references.slice(0, 5);

  const aImages = [...productImages, ...packageImages];
  const bImages = referenceImages;

  if (aImages.length === 0 && bImages.length === 0) return null;

  const hasReferences = bImages.length > 0;

  // 프롬프트 구성
  const prompt = buildAnalysisPrompt(aImages.length, bImages.length, hasReferences);

  // Gemini API 파츠 구성
  const parts: Array<
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }
  > = [{ text: prompt }];

  // A 이미지 (제품/패키지) 추가
  for (const img of aImages) {
    const compressed = await compressImageForAPI(img, 600, 0.4);
    const base64Data = compressed.replace(/^data:image\/\w+;base64,/, '');
    parts.push({
      inlineData: { mimeType: 'image/jpeg', data: base64Data },
    });
  }

  // B 이미지 (레퍼런스) 추가
  for (const img of bImages) {
    const compressed = await compressImageForAPI(img, 600, 0.4);
    const base64Data = compressed.replace(/^data:image\/\w+;base64,/, '');
    parts.push({
      inlineData: { mimeType: 'image/jpeg', data: base64Data },
    });
  }

  // API 호출
  const url = useBackend
    ? `${backendUrl}/api/gemini`
    : `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

  const reqBody: Record<string, unknown> = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 4000,
    },
  };

  if (useBackend) reqBody.model = 'gemini-2.5-flash';

  const response = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
    },
    60000
  );

  if (!response.ok) {
    throw new Error('디자인 브리프 분석 API 오류');
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // JSON 파싱
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const brief = JSON.parse(jsonMatch[0]) as DesignBrief;

      // designGuide가 없는 경우 (레퍼런스 미제공) null 처리
      if (!hasReferences && brief.designGuide) {
        brief.designGuide = null;
      }

      return brief;
    }
  } catch (e) {
    console.warn('디자인 브리프 JSON 파싱 실패:', e);
  }

  return null;
}

/**
 * 통합 분석 프롬프트 생성
 */
function buildAnalysisPrompt(
  aCount: number,
  bCount: number,
  hasReferences: boolean
): string {
  let prompt = `당신은 한국 이커머스 상세페이지 전문 CD(Creative Director)입니다.
잘 팔리는 상세페이지를 기획하는 전문가로서, 아래 이미지를 분석하고 디자인 브리프를 작성하세요.

━━ 이미지 구분 ━━
- 처음 ${aCount}장 = [A] 제품/패키지 촬영 사진 (실제 판매할 제품)`;

  if (hasReferences) {
    prompt += `
- 나머지 ${bCount}장 = [B] 디자인 레퍼런스 (디자인 스타일 참고용)`;
  }

  prompt += `

━━ STEP 1: 구매 심리 분석 ━━
[A] 제품의 카테고리와 포지셔닝을 고려하여 분석하세요:

purchaseAnalysis:
- buyingMotivation: 이 제품을 검색하는 사람이 해결하고 싶은 문제/욕구
- purchaseBarriers: 사기 전에 망설이게 만드는 요소
- decisiveMessage: 장바구니에 넣게 만드는 결정적 정보
- competitiveDiff: 이 제품만의 시각적으로 보이는 차별점

━━ STEP 2: 섹션별 설득 전략 + 시각 변주 (8개 섹션) ━━
이 제품의 카테고리와 포지셔닝을 고려하여
8개 섹션 각각에 대해 정의하세요.

sectionStrategies 배열 (8개), 각 항목:
- sectionNumber: 1~8
- persuasionRole: 이 섹션이 소비자에게 전달해야 할 핵심 메시지
- visualMethod: 그 메시지를 가장 효과적으로 전달하는 시각적 방법
- informationVisualization: 텍스트 문장이 아닌 타이포/아이콘/그래픽으로 어떻게 표현할지 구체적으로 서술
- visualMode: 아래 6가지 중 택 1 (제품 이미지 활용 전략)
  * "product-hero": 제품 누끼를 크게 배치 + 소품 연출 (히어로/피처드 섹션)
  * "product-detail": 원재료/성분/질감 클로즈업, 제품 일부 확대
  * "infographic": 아이콘·차트·배지·숫자 중심 — 제품 이미지 없이 순수 정보 전달
  * "lifestyle": 실제 사용 장면, TPO(시간/장소/상황) 연출
  * "emotional": 브랜드 감성·분위기 중심, 제품 최소화 또는 없음
  * "social-proof": 고객 후기·별점·추상 신뢰 아이콘 중심 (실제 인증마크/수상 배지 금지), 제품 이미지 불필요
- visualVariation:
  - backgroundTone: 배경 톤/색상 (이전 섹션과 반드시 다르게)
  - layoutType: 레이아웃 유형 (풀블리드/좌우분할/그리드/중앙집중/원형방사 등, 이전 섹션과 반드시 다르게)
  - informationDensity: 정보 밀도 (높음/중간/낮음)
  - emotionCurve: 감정 곡선 위치 (임팩트/공감/해소/납득/욕구/신뢰/전환)

⚠️ 필수 규칙:
- 연속 2개 섹션이 같은 배경 톤이면 안 됩니다
- 연속 2개 섹션이 같은 레이아웃이면 안 됩니다
- 8개 섹션이 스크롤 시 시각적 리듬감이 있어야 합니다
- 문장형 텍스트 최소화, 시각 요소(타이포/아이콘/그래픽) 우선
- 핵심 수치/키워드는 초대형 타이포로 표현
- 특징/장점 나열은 아이콘+짧은 단어 조합으로 표현

⚠️ visualMode 필수 규칙:
- 섹션 1(히어로)은 반드시 "product-hero"
- "product-hero"나 "product-detail"이 연속 3개 이상 이어지면 안 됩니다
- 8개 섹션 중 최소 2개는 "infographic" 또는 "emotional" (시각적 쉼표 역할)
- 제품이 등장하는 섹션(product-hero/product-detail/lifestyle)과 등장하지 않는 섹션(infographic/emotional/social-proof)이 교차하여 리듬감을 형성하세요
- 이 제품의 카테고리와 특성을 고려하여 각 섹션에 가장 적합한 visualMode를 판단하세요`;

  if (hasReferences) {
    prompt += `

━━ STEP 3: [B]의 디자인 기법을 [A] 제품에 적용 ━━
[B] 레퍼런스 이미지의 디자인 기법을 분석하고, [A] 제품 상세페이지에 어떻게 적용할지 서술하세요.

designGuide:
- colorUsage: [B]의 컬러 사용법(배색 비율, 강조 방식)을 참고하되, 실제 색상은 [A] 제품 패키지에서 추출하여 적용한 결과
- typographyAndCopy: [B]의 서체 조합과 강조 기법을 [A] 제품의 카테고리에 맞게 적용한 결과
- layoutAndPlacement: [B]의 구도와 배치 방식을 [A] 제품의 소구 포인트에 맞게 적용한 결과
- productPresentation: [A]의 제품 사진을 [B]의 연출 스타일로 배치하는 방법
- backgroundAndDecoration: [B]의 배경 처리를 [A]의 브랜드 톤에 맞게 변환한 결과
- informationVisualization: 핵심 정보를 텍스트 문장이 아닌 시각 요소로 전달하는 구체적 방법`;
  } else {
    prompt += `

━━ 참고 ━━
디자인 레퍼런스가 제공되지 않았습니다. designGuide는 null로 설정하세요.
제품/패키지 이미지만 기반으로 최적의 디자인 전략을 수립하세요.`;
  }

  prompt += `

━━ CD 검수 (자기 검토) ━━
위 브리프를 크리에이티브 디렉터 관점에서 검토하세요:
1. 소비자가 3초 안에 각 섹션의 핵심을 파악할 수 있는가?
2. 8개 섹션 간 시각적 리듬감이 있는가? (배경/레이아웃 반복 없는가?)
3. 문장형 텍스트가 과도하지 않은가? 시각 요소로 전달되는가?
4. 제품의 카테고리/포지셔닝과 디자인이 어울리는가?
${hasReferences ? '5. 레퍼런스 스타일이 잘 녹아있되, 너무 똑같지는 않은가?' : ''}

문제가 있으면 위 STEP 1~${hasReferences ? '3' : '2'}의 내용을 직접 수정한 후,
수정 내역을 cdReview 필드에 기록하세요. 문제 없으면 "검수 통과"로 기록.

━━ 출력 형식 ━━
아래 JSON 구조로만 출력하세요. 다른 설명은 하지 마세요.

{
  "purchaseAnalysis": { "buyingMotivation": "...", "purchaseBarriers": "...", "decisiveMessage": "...", "competitiveDiff": "..." },
  "sectionStrategies": [
    { "sectionNumber": 1, "persuasionRole": "...", "visualMethod": "...", "informationVisualization": "...", "visualMode": "product-hero", "visualVariation": { "backgroundTone": "...", "layoutType": "...", "informationDensity": "...", "emotionCurve": "..." } },
    ...8개
  ],
  "designGuide": ${hasReferences ? '{ "colorUsage": "...", "typographyAndCopy": "...", "layoutAndPlacement": "...", "productPresentation": "...", "backgroundAndDecoration": "...", "informationVisualization": "..." }' : 'null'},
  "cdReview": "..."
}`;

  return prompt;
}
