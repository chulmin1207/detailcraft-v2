// ===== PLAN SERVICE (Simplified) =====
// Track 1 전용: Claude로 13개 섹션 기획 생성

import type { Section, SectionType } from '@/shared/types';

// ===== 프롬프트 빌더 =====
export function buildPlanPrompt(productName: string, productFeatures: string): string {
  return `당신은 한국 이커머스 상세페이지 기획 전문가입니다.

아래 제품 정보를 바탕으로 상세페이지 기획서를 작성하세요.
정확히 13개 섹션을 아래 순서대로 생성하세요.

제품명: ${productName}
제품 특징: ${productFeatures || '(없음)'}

★★★ 섹션 구조 (정확히 13개, 이 순서대로) ★★★
1. hero (히어로) — 브랜드 첫인상, 제품명과 핵심 메시지
2. empathy (공감) — 고객의 고민/니즈에 공감
3. point (포인트 01) — 핵심 셀링포인트 1
4. point (포인트 02) — 핵심 셀링포인트 2
5. point (포인트 03) — 핵심 셀링포인트 3
6. sizzle (씨즐컷) — 제품의 맛/질감/식욕 자극
7. trust (신뢰) — 원재료, 품질, 안전성
8. divider (전환 배너) — 시각적 환기
9. lifestyle (라이프스타일) — 일상 속 활용 장면
10. situation (상황/TPO) — 다양한 즐기는 방법
11. review (리뷰) — 고객 후기
12. cta (CTA) — 구매 유도
13. spec (제품 정보) — 스펙, 영양성분, 원재료

★★★ 금지 규칙 ★★★
- 입력에 없는 수치를 지어내지 마세요 (칼로리, 성분 비율 등)
- 과장된 형용사 금지 (완벽한, 혁신적, 게임체인저 등)
- 확인되지 않은 인증/수상 정보 금지
- "놓치지 마세요", "서두르세요" 같은 강요성 CTA 금지

★★★ 출력 형식 ★★★
각 섹션을 아래 형식으로 출력하세요:

[SECTION_START]
섹션번호: 1
섹션명: 히어로
섹션유형: hero
헤드라인: (이 섹션의 메인 카피)
서브카피: (보조 카피)
비주얼 지시: (이 섹션의 이미지에 들어갈 시각적 요소 설명)
[SECTION_END]

★★★ 반드시 13개의 [SECTION_START]...[SECTION_END] 블록을 출력하세요 ★★★`;
}

// ===== Claude API 호출 =====
export async function callClaudeForPlan(
  prompt: string,
  config: { useBackend: boolean; backendUrl: string }
): Promise<string> {
  const { useBackend, backendUrl } = config;

  if (!useBackend) {
    throw new Error('Track 1은 백엔드 프록시를 통해서만 사용할 수 있습니다.');
  }

  const url = `${backendUrl}/api/claude`;

  const requestBody = {
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }],
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);

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

  // SSE 스트림 응답 파싱
  const text = await response.text();
  const lines = text.split('\n');
  let result = '';

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

  if (!result) {
    throw new Error('Claude 응답이 비어있습니다.');
  }

  return result;
}

// ===== 섹션 파싱 =====
const VALID_SECTION_TYPES = new Set<string>([
  'hero', 'empathy', 'point', 'sizzle', 'trust',
  'divider', 'lifestyle', 'situation', 'review', 'cta', 'spec',
]);

function normalizeType(raw: string): SectionType {
  const cleaned = raw.trim().toLowerCase().replace(/[^a-z-]/g, '');
  if (VALID_SECTION_TYPES.has(cleaned)) return cleaned as SectionType;
  // 한글 매핑
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

    sections.push({ number, name, sectionType, headline, subCopy, visualPrompt });
  }

  return sections;
}
