// ===== PLAN SERVICE =====
// Claude가 제품이미지 + 레퍼런스를 분석하여
// 한글 기획안 + 영문 JSON 프롬프트를 생성

import type { Section, SectionType, SectionPromptJson, ProductInfoJson } from '@/shared/types';

// ===== Base64 헬퍼 =====
function safeExtractBase64(dataUrl: string): string {
  const parts = dataUrl.split(',');
  return parts.length > 1 ? parts[1] : dataUrl;
}

// ===== 프롬프트 빌더 =====
export function buildPlanPrompt(productName: string, productFeatures: string): string {
  return `당신은 한국 이커머스 상세페이지 기획 + 이미지 프롬프트 전문가입니다.

아래 제품 정보와 첨부된 이미지들을 분석하여 두 가지를 생성하세요:
1. 한글 기획안 (유저가 읽고 수정하는 용도)
2. 영문 JSON (Gemini 이미지 생성에 직접 전달되는 용도)

제품명: ${productName}
제품 특징: ${productFeatures || '(없음)'}

★★★ 중요: 첨부된 이미지를 반드시 분석하세요 ★★★
- 제품 이미지: 패키지 색상, 형태, 전면표기사항, 구성품을 정확히 읽어내세요
- 레퍼런스 이미지: 구도, 카메라 앵글, 조명, 배치 구조, 네거티브 스페이스 비율을 분석하세요

★★★ 핵심 규칙 ★★★
- 레퍼런스에서 가져오는 것: 구도, 카메라 앵글, 조명, 배치 구조, 네거티브 스페이스 비율
- 제품에 맞게 바꾸는 것: 배경색, 소품, 톤, 분위기 (제품과 어울리게)
- 예: 레퍼런스가 딸기스무디(분홍 배경, 딸기 소품)인데 제품이 소다맛 과자라면 → 하늘색 배경, 탄산/라임 소품으로 변환

★★★ 금지 규칙 ★★★
- 입력에 없는 수치를 지어내지 마세요
- 과장된 형용사 금지
- 확인되지 않은 인증/수상 정보 금지
- 이미지에 텍스트/글자를 넣지 마세요 — 순수 비주얼 이미지만

★★★ 섹션 구조 (정확히 13개, 이 순서대로) ★★★
1. hero (히어로) — 브랜드 첫인상
2. empathy (공감) — 고객의 고민/니즈
3. point (포인트 01) — 핵심 셀링포인트 1
4. point (포인트 02) — 핵심 셀링포인트 2
5. point (포인트 03) — 핵심 셀링포인트 3
6. sizzle (씨즐컷) — 제품의 맛/질감/식욕 자극
7. trust (신뢰) — 원재료, 품질, 안전성
8. divider (전환 배너) — 시각적 환기
9. lifestyle (라이프스타일) — 일상 속 활용 장면
10. situation (상황/TPO) — 다양한 즐기는 방법
11. review (리뷰) — 고객 후기 3개 (각각 다른 관점)
12. cta (CTA) — 구매 유도
13. spec (제품 정보) — 스펙, 영양성분, 원재료

★★★ 출력 형식 ★★★

먼저 제품 정보 JSON을 출력하세요:
[PRODUCT_JSON_START]
{
  "name": "(영문 제품명)",
  "packageType": "(pouch/box/bottle/bar/can)",
  "packageSize": "(예: 120mm x 82.5mm)",
  "frontMarkings": "(패키지 전면에 보이는 모든 텍스트를 영문+한글 혼합으로 정확히 기록)",
  "components": ["(구성품1 영문)", "(구성품2 영문)"]
}
[PRODUCT_JSON_END]

그 다음 각 섹션을 아래 형식으로 출력하세요:

[SECTION_START]
섹션번호: 1
섹션명: 히어로
섹션유형: hero
헤드라인: (한글 메인 카피)
서브카피: (한글 보조 카피)
비주얼 지시: (한글 시각적 요소 설명)
[PROMPT_JSON]
{
  "fromReference": {
    "composition": "(레퍼런스에서 분석한 구도를 영문으로 상세히)",
    "cameraAngle": "(카메라 앵글)",
    "lighting": "(조명 방식)",
    "productOccupancy": "(화면 내 제품 비율)",
    "negativeSpace": "(여백 방향과 비율)"
  },
  "adaptedForProduct": {
    "backgroundColor": "(제품에 어울리는 배경색 hex 또는 영문 설명)",
    "props": ["(제품에 어울리는 소품1)", "(소품2)"],
    "toneMood": "(전체 분위기 영문)",
    "colorPalette": "(색상 팔레트 영문)"
  },
  "scaleRules": "(크기/비율 규칙 영문)",
  "packageIntegrity": "design strictly unchanged, no warp, no distorted text, front markings preserved",
  "frontMarkings": "(패키지 전면표기사항 — PRODUCT_JSON과 동일)",
  "additionalDirections": "(이 섹션에 특화된 추가 지시 영문)"
}
[/PROMPT_JSON]
[SECTION_END]

★★★ 반드시 1개의 PRODUCT_JSON + 13개의 SECTION을 출력하세요 ★★★`;
}

// ===== Claude API 호출 (멀티모달) =====
export async function callClaudeForPlan(
  prompt: string,
  config: { useBackend: boolean; backendUrl: string },
  images?: { productImage?: string; referenceImages?: string[]; toneReferenceImages?: string[] }
): Promise<string> {
  const { useBackend, backendUrl } = config;

  if (!useBackend) {
    throw new Error('백엔드 프록시를 통해서만 사용할 수 있습니다.');
  }

  // 멀티모달 content 구성
  const content: Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> = [];

  // 텍스트 프롬프트
  content.push({ type: 'text', text: prompt });

  // 제품 이미지
  if (images?.productImage) {
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: safeExtractBase64(images.productImage),
      },
    });
    content.push({ type: 'text', text: '위는 제품 이미지입니다. 패키지의 색상, 형태, 전면표기사항, 구성품을 정확히 분석하세요.' });
  }

  // 레퍼런스 이미지
  const refs = images?.referenceImages?.filter(Boolean) || [];
  for (let i = 0; i < refs.length; i++) {
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: safeExtractBase64(refs[i]),
      },
    });
    content.push({ type: 'text', text: `위는 레이아웃 레퍼런스 ${i + 1}입니다. 구도, 카메라 앵글, 조명, 배치, 네거티브 스페이스를 분석하세요.` });
  }

  // 톤 레퍼런스 이미지
  const toneRefs = images?.toneReferenceImages?.filter(Boolean) || [];
  for (let i = 0; i < toneRefs.length; i++) {
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: safeExtractBase64(toneRefs[i]),
      },
    });
    content.push({ type: 'text', text: `위는 톤 레퍼런스 ${i + 1}입니다. 색감과 분위기를 참고하세요.` });
  }

  const url = `${backendUrl}/api/claude`;
  const requestBody = {
    model: 'claude-sonnet-4-6',
    max_tokens: 32000,
    messages: [{ role: 'user', content }],
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 180000);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
    signal: controller.signal,
  });

  clearTimeout(timer);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API 오류 (${response.status}): ${error}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('응답 스트림을 읽을 수 없습니다.');

  const decoder = new TextDecoder();
  let result = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'content_block_delta' && data.delta?.text) {
            result += data.delta.text;
          }
        } catch {
          // JSON 파싱 실패 무시
        }
      }
    }
  }

  if (!result) {
    throw new Error('Claude 응답이 비어있습니다.');
  }

  return result;
}

// ===== 제품 정보 JSON 파싱 =====
export function parseProductJson(text: string): ProductInfoJson | null {
  const match = text.match(/\[PRODUCT_JSON_START\]\s*([\s\S]*?)\s*\[PRODUCT_JSON_END\]/);
  if (!match) return null;

  try {
    return JSON.parse(match[1]) as ProductInfoJson;
  } catch {
    console.error('제품 JSON 파싱 실패');
    return null;
  }
}

// ===== 섹션 파싱 =====
const VALID_SECTION_TYPES = new Set<string>([
  'hero', 'empathy', 'point', 'sizzle', 'trust',
  'divider', 'lifestyle', 'situation', 'review', 'cta', 'spec',
]);

function normalizeType(raw: string): SectionType {
  const cleaned = raw.trim().toLowerCase().replace(/[^a-z-]/g, '');
  if (VALID_SECTION_TYPES.has(cleaned)) return cleaned as SectionType;
  const map: Record<string, SectionType> = {
    '히어로': 'hero', '공감': 'empathy', '포인트': 'point',
    '씨즐': 'sizzle', '씨즐컷': 'sizzle', '신뢰': 'trust',
    '전환': 'divider', '디바이더': 'divider', '구분선': 'divider',
    '라이프스타일': 'lifestyle', '상황': 'situation',
    '리뷰': 'review', '후기': 'review',
    '구매유도': 'cta', '제품정보': 'spec', '스펙': 'spec',
  };
  return map[raw.trim()] || 'point';
}

function parsePromptJson(block: string): SectionPromptJson | undefined {
  const match = block.match(/\[PROMPT_JSON\]\s*([\s\S]*?)\s*\[\/PROMPT_JSON\]/);
  if (!match) return undefined;

  try {
    return JSON.parse(match[1]) as SectionPromptJson;
  } catch {
    console.error('프롬프트 JSON 파싱 실패');
    return undefined;
  }
}

export function parseSections(text: string): Section[] {
  const regex = /\[SECTION_START\]([\s\S]*?)\[SECTION_END\]/g;
  const sections: Section[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    const block = match[1];
    const get = (key: string): string => {
      const m = block.match(new RegExp(`${key}:\\s*(.+?)(?:\\n|$)`));
      return m ? m[1].trim() : '';
    };

    const number = parseInt(get('섹션번호')) || sections.length + 1;
    const name = get('섹션명') || `섹션 ${number}`;
    const sectionType = normalizeType(get('섹션유형'));
    const headline = get('헤드라인');
    const subCopy = get('서브카피');
    const visualPrompt = get('비주얼 지시') || get('비주얼지시');
    const promptJson = parsePromptJson(block);

    sections.push({ number, name, sectionType, headline, subCopy, visualPrompt, promptJson });
  }

  return sections;
}
