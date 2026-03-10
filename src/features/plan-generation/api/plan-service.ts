import { fetchWithTimeout } from '@/shared/api/instance';
import { compressImageForAPI } from '@/features/image-generation/api/image-service';
import type {
  Section,
  Category,
  PriceRange,
  ImageAnalysis,
  CategoryGuideItem,
} from '@/shared/types';

// ===== 카테고리별 상세 가이드 =====
const categoryGuide: Record<Category, CategoryGuideItem> = {
  snack: {
    keywords: '바삭함, 고소함, 달콤함, 짭짤함, 중독성, 간식, 야식, 힐링',
    emotions: '소확행, 나만의 시간, 위로, 행복한 순간',
    painPoints: '살찔까봐 걱정, 건강에 안 좋을까, 양이 적을까',
    trustElements: '원재료 원산지, 무첨가, 전통 방식, 장인 정신',
  },
  beverage: {
    keywords: '청량감, 깔끔함, 시원함, 달콤함, 건강, 에너지',
    emotions: '갈증 해소, 활력 충전, 휴식, 리프레시',
    painPoints: '당분 걱정, 카페인 부작용, 인공 첨가물',
    trustElements: '천연 원료, 무설탕, 저칼로리, 유기농 인증',
  },
  instant: {
    keywords: '간편함, 빠름, 맛있음, 든든함, 실속',
    emotions: '바쁜 일상 속 여유, 혼밥의 즐거움, 자취 필수템',
    painPoints: '맛없을까봐, 영양 불균형, 나트륨 걱정',
    trustElements: 'HACCP, 국내산 재료, 유명 셰프 레시피',
  },
  health: {
    keywords: '건강, 활력, 면역력, 피로회복, 영양보충',
    emotions: '건강한 미래, 가족 건강, 자기관리, 투자',
    painPoints: '효과 있을까, 부작용 걱정, 가격 대비 효과',
    trustElements: '식약처 인증, 임상시험, 특허 성분, 전문가 추천',
  },
  beauty: {
    keywords: '피부결, 광채, 탄력, 보습, 안티에이징',
    emotions: '자신감, 아름다움, 관리받는 느낌, 럭셔리',
    painPoints: '피부 트러블, 효과 체감 시간, 성분 안전성',
    trustElements: '피부과 테스트, 천연 성분, 비건, 무자극',
  },
  living: {
    keywords: '편리함, 실용성, 공간활용, 청결, 효율',
    emotions: '깔끔한 집, 스마트한 생활, 시간 절약',
    painPoints: '내구성, 실제 사용성, 공간 차지',
    trustElements: 'KC인증, AS보장, 사용 후기, 품질 보증',
  },
  other: {
    keywords: '품질, 가치, 만족, 신뢰',
    emotions: '만족감, 현명한 선택, 가성비',
    painPoints: '품질 걱정, 가격 대비 가치, 필요성',
    trustElements: '품질 인증, 고객 후기, 브랜드 신뢰도',
  },
};

// ===== 가격대별 전략 =====
const priceStrategy: Record<string, string> = {
  budget: '가성비 강조, 실속 있는 선택, 부담 없는 가격',
  mid: '합리적인 가격, 품질과 가격의 균형, 현명한 소비',
  premium: '프리미엄 가치, 투자할 만한 이유, 차별화된 경험',
  luxury: '최고급 품질, 특별한 경험, 나를 위한 선물',
};

// ===== 기획서 프롬프트 빌더 =====
interface PlanPromptData {
  productName: string;
  category: Category;
  priceRange: PriceRange;
  targetAudience: string;
  productFeatures?: string;
  additionalNotes?: string;
}

export function buildPlanPrompt(
  data: PlanPromptData,
  imageAnalysis: ImageAnalysis | null = null
): string {
  const d = data;
  const catData = categoryGuide[d.category] || categoryGuide['other'];
  const priceMsg = priceStrategy[d.priceRange] || priceStrategy['mid'];

  // 이미지 분석 결과 섹션 생성
  let imageAnalysisSection = '';
  if (imageAnalysis) {
    imageAnalysisSection = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 🖼️ 제품 이미지 분석 결과 (AI Vision)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ 아래는 실제 제품 이미지를 AI가 분석한 결과입니다. 이 정보를 최우선으로 활용하세요!

- 제품 외형: ${imageAnalysis.productAppearance || '분석 불가'}
- 패키지 디자인: ${imageAnalysis.packageDesign || '분석 불가'}
- 이미지에서 읽은 텍스트: ${imageAnalysis.textFromImage || '없음'}
- 추정 상세 카테고리: ${imageAnalysis.productCategory || '알 수 없음'}
- 이미지 기반 제품 특징: ${imageAnalysis.keyFeatures?.join(', ') || '분석 불가'}
- 제품 분위기/톤: ${imageAnalysis.moodAndTone || '알 수 없음'}
- 추정 타겟층: ${imageAnalysis.targetAudienceGuess || '알 수 없음'}
- 주요 색상: ${imageAnalysis.colorPalette?.join(', ') || '알 수 없음'}
- 시각적 USP: ${imageAnalysis.uniqueSellingPoints?.join(', ') || '분석 불가'}

💡 위 이미지 분석 결과와 사용자 입력 정보를 종합하여 기획서를 작성하세요.
   이미지에서 발견된 특징과 텍스트를 적극 활용하면 더 정확한 기획이 됩니다.
`;
  }

  return `# 역할
당신은 한국 이커머스 시장에서 15년 경력의 "전환율 최적화(CRO) 전문 카피라이터"입니다.
쿠팡, 네이버 스마트스토어, 무신사 등에서 수백 개의 상세페이지를 제작했고, 평균 전환율을 3배 이상 높인 실적이 있습니다.

# 핵심 미션
"${d.productName}" 상품의 구매 전환율을 극대화하는 상세페이지 기획서를 작성합니다.
${imageAnalysisSection}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 📦 제품 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 제품명: ${d.productName}
- 카테고리: ${d.category}
- 가격 포지셔닝: ${d.priceRange} (${priceMsg})
- 핵심 타겟: ${d.targetAudience}
- 제품 특징/USP: ${d.productFeatures || '제품 특징을 기반으로 창의적으로 작성'}
- 추가 요청사항: ${d.additionalNotes || '없음'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 🎯 카테고리 인사이트
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 핵심 키워드: ${catData.keywords}
- 감성 포인트: ${catData.emotions}
- 구매 저항 요소: ${catData.painPoints}
- 신뢰 구축 요소: ${catData.trustElements}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 🧠 작성 전 필수 분석 (Step-by-Step)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### STEP 1: 핵심 가치 정의
다음 문장을 완성하세요:
"[타겟 고객]이 [제품명]을 통해 [핵심 베네핏]을 얻는다"

### STEP 2: 3가지 핵심 베네핏 도출
제품 특징에서 고객이 실제로 "체감"할 수 있는 베네핏 3가지:
1. 기능적 베네핏: 제품이 해결하는 실질적 문제
2. 감성적 베네핏: 사용 시 느끼는 감정/경험
3. 사회적 베네핏: 타인에게 보여지는 이미지/가치

### STEP 3: 구매 저항 분석 및 극복
타겟이 구매를 망설이는 3가지 이유와 각각의 극복 전략:
- 저항 1 → 극복 카피
- 저항 2 → 극복 카피
- 저항 3 → 극복 카피

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## ✍️ 카피라이팅 원칙 (필수 준수)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 헤드라인 작성법
- 길이: 10~18자 (공백 포함)
- 스타일: 강렬하고 임팩트 있게, 호기심 유발
- 금지: "최고의", "완벽한" 같은 추상적 표현
- 권장: 구체적 숫자, 감각적 표현, 질문형, 대비 활용

✅ 좋은 예시:
- "하루 5분, 피부가 달라진다"
- "1,847명이 선택한 그 맛"
- "아직도 매일 아침 피곤하세요?"
- "프로틴 30g, 맛은 디저트급"

❌ 나쁜 예시:
- "최고의 품질을 자랑합니다"
- "완벽한 선택"
- "믿을 수 있는 제품"

### 서브카피 작성법
- 길이: 25~50자
- 역할: 헤드라인을 보완하고 구체적 베네핏 제시
- 톤: 자연스럽고 친근하게, 대화하듯이

### 절대 금지 사항
- "지금 바로 구매하세요!" 같은 강압적 CTA
- "놓치지 마세요!", "서두르세요!" 같은 조급함 유발
- 근거 없는 과장 표현
- 경쟁사 비방

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 📋 출력 형식 (반드시 준수)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

8개 섹션을 [SECTION_START]와 [SECTION_END] 태그로 감싸서 작성합니다.
각 섹션에는 헤드라인 대안 10개, 서브카피 대안 10개를 포함합니다.

⚠️ 중요: 괄호() 사용 금지! 모든 필드에 실제 완성된 문구만 작성하세요.

### 섹션별 가이드

**섹션 1: 히어로 배너**
- 목적: 3초 안에 시선 사로잡기
- 헤드라인: 제품의 핵심 가치를 한 문장으로
- 예시 헤드라인: "매일 아침이 기대되는 이유"

**섹션 2: 문제 제기 / 공감**
- 목적: "내 얘기다!" 공감 유발
- 헤드라인: 타겟의 고민/불편함 직접 언급
- 예시 헤드라인: "또 피곤한 하루, 언제까지?"

**섹션 3: 솔루션 제시**
- 목적: 제품이 해결책임을 자연스럽게 제시
- 헤드라인: 문제 해결의 실마리 제시
- 예시 헤드라인: "답은 생각보다 간단했습니다"

**섹션 4: 베네핏 상세**
- 목적: 3가지 핵심 베네핏 상세 설명
- 헤드라인: 가장 강력한 베네핏 강조
- 예시 헤드라인: "달라진 일상, 3가지 변화"

**섹션 5: 제품 상세 / 스펙**
- 목적: 구체적 정보로 신뢰 구축
- 헤드라인: 차별화 포인트 강조
- 예시 헤드라인: "성분 하나까지 꼼꼼하게"

**섹션 6: 사용 방법 / TPO**
- 목적: 실제 사용 상황 시각화
- 헤드라인: 사용의 편리함/간편함 강조
- 예시 헤드라인: "이렇게 쉬울 줄이야"

**섹션 7: 신뢰 요소**
- 목적: 구매 저항 해소, 사회적 증거
- 헤드라인: 검증된 신뢰 강조
- 예시 헤드라인: "이미 10만 명이 경험했습니다"

**섹션 8: 마무리**
- 목적: 핵심 메시지 재강조, 부드러운 클로징
- 헤드라인: 감성적 마무리
- 예시 헤드라인: "당신의 선택을 응원합니다"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 📝 출력 템플릿
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[SECTION_START]
섹션번호: 1
섹션명: 히어로 배너
목적: 3초 안에 핵심 가치 전달, 스크롤 유도
헤드라인: 여기에 실제 헤드라인 작성
헤드라인대안: 대안1 | 대안2 | 대안3 | 대안4 | 대안5 | 대안6 | 대안7 | 대안8 | 대안9 | 대안10
서브카피: 여기에 실제 서브카피 작성
서브카피대안: 대안1 | 대안2 | 대안3 | 대안4 | 대안5 | 대안6 | 대안7 | 대안8 | 대안9 | 대안10
CTA문구: 자세히 보기
비주얼 지시: 이미지 생성 AI에게 전달할 상세한 시각적 지시문 작성
비주얼지시대안: 대안1 | 대안2 | 대안3 | 대안4 | 대안5 | 대안6 | 대안7 | 대안8 | 대안9 | 대안10
[SECTION_END]

위 형식으로 8개 섹션 모두 작성해주세요.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## ⚠️ 최종 체크리스트
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ 모든 헤드라인이 15자 내외인가?
□ 괄호() 없이 실제 문구만 작성했는가?
□ 강압적인 CTA 표현이 없는가?
□ 헤드라인 대안 10개가 모두 다른 스타일인가?
□ 제품 특징이 베네핏으로 잘 변환되었는가?
□ 타겟 고객의 언어로 작성되었는가?

지금 바로 위 분석을 수행하고 8개 섹션의 기획서를 작성해주세요.`;
}

// ===== 섹션 파싱 =====
// Gemini 응답 텍스트를 섹션 객체 배열로 파싱
export function parseSections(text: string): Section[] {
  const sections: Section[] = [];
  const regex = /\[SECTION_START\]([\s\S]*?)\[SECTION_END\]/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const content = match[1];

    const numMatch = content.match(/섹션번호:\s*(\d+)/);
    const nameMatch = content.match(/섹션명:\s*(.+)/);
    const purposeMatch = content.match(/목적:\s*(.+)/);
    const headlineMatch = content.match(/헤드라인:\s*(.+)/);
    const headlineAltMatch = content.match(/헤드라인대안:\s*(.+)/);
    const subMatch = content.match(/서브카피:\s*(.+)/);
    const subAltMatch = content.match(/서브카피대안:\s*(.+)/);
    const visualMatch = content.match(
      /비주얼 지시:\s*([\s\S]+?)(?=\n[가-힣]+:|$)/
    );
    const visualAltMatch = content.match(/비주얼지시대안:\s*(.+)/);

    const number = numMatch ? parseInt(numMatch[1]) : sections.length + 1;

    const section: Section = {
      number,
      name: nameMatch ? nameMatch[1].trim() : `섹션 ${number}`,
      purpose: purposeMatch ? purposeMatch[1].trim() : '',
      headline: headlineMatch ? headlineMatch[1].trim() : '',
      subCopy: subMatch ? subMatch[1].trim() : '',
      visualPrompt: visualMatch ? visualMatch[1].trim() : '',
      headlineAlts: headlineAltMatch
        ? headlineAltMatch[1]
            .split('|')
            .map((s) => s.trim())
            .filter((s) => s)
        : [],
      subCopyAlts: subAltMatch
        ? subAltMatch[1]
            .split('|')
            .map((s) => s.trim())
            .filter((s) => s)
        : [],
      visualPromptAlts: visualAltMatch
        ? visualAltMatch[1]
            .split('|')
            .map((s) => s.trim())
            .filter((s) => s)
        : [],
    };

    sections.push(section);
  }

  // Fallback if parsing fails entirely
  if (sections.length === 0) {
    for (let i = 1; i <= 8; i++) {
      sections.push({
        number: i,
        name: `섹션 ${i}`,
        purpose: '',
        headline: '',
        subCopy: '',
        visualPrompt:
          'Product photography, clean background, professional lighting',
        headlineAlts: [],
        subCopyAlts: [],
        visualPromptAlts: [],
      });
    }
  }

  // Pad to 8 sections if partially parsed (e.g., API returned truncated response)
  const sectionNames = [
    '히어로 배너', '문제 제기 / 공감', '솔루션 제시', '베네핏 상세',
    '제품 상세 / 스펙', '사용 방법 / TPO', '신뢰 요소', '마무리',
  ];
  while (sections.length < 8) {
    const num = sections.length + 1;
    sections.push({
      number: num,
      name: sectionNames[num - 1] || `섹션 ${num}`,
      purpose: '',
      headline: '',
      subCopy: '',
      visualPrompt:
        'Product photography, clean background, professional lighting',
      headlineAlts: [],
      subCopyAlts: [],
      visualPromptAlts: [],
    });
  }

  return sections;
}

// ===== Claude API 호출 (기획서 생성) =====
interface CallClaudeConfig {
  useBackend: boolean;
  backendUrl: string;
  claudeApiKey: string;
}

export async function callClaudeForPlan(
  prompt: string,
  config: CallClaudeConfig
): Promise<string> {
  const { useBackend, backendUrl, claudeApiKey } = config;

  const url = useBackend
    ? `${backendUrl}/api/claude`
    : 'https://api.anthropic.com/v1/messages';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!useBackend) {
    headers['x-api-key'] = claudeApiKey;
    headers['anthropic-version'] = '2023-06-01';
  }

  const requestBody = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  };

  const response = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    },
    180000
  );

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as {
      error?: { message?: string } | string;
    };
    if (response.status === 401 || response.status === 403)
      throw new Error('API 키가 유효하지 않습니다.');
    if (response.status === 429)
      throw new Error('요청 한도 초과. 잠시 후 다시 시도해주세요.');
    if (response.status === 504)
      throw new Error('서버 타임아웃. 잠시 후 다시 시도해주세요.');
    const errorMessage =
      typeof errorData.error === 'object'
        ? errorData.error?.message
        : errorData.error;
    throw new Error(errorMessage || '알 수 없는 오류');
  }

  // 백엔드가 SSE 스트림을 반환하므로 파싱하여 텍스트 추출
  if (useBackend) {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]' || !jsonStr) continue;

        try {
          const event = JSON.parse(jsonStr) as {
            type?: string;
            delta?: { text?: string };
          };
          if (event.type === 'content_block_delta' && event.delta?.text) {
            fullText += event.delta.text;
          }
        } catch {
          // skip malformed SSE event
        }
      }
    }

    if (buffer.startsWith('data: ')) {
      const jsonStr = buffer.slice(6).trim();
      if (jsonStr && jsonStr !== '[DONE]') {
        try {
          const event = JSON.parse(jsonStr) as {
            type?: string;
            delta?: { text?: string };
          };
          if (event.type === 'content_block_delta' && event.delta?.text) {
            fullText += event.delta.text;
          }
        } catch {
          // skip
        }
      }
    }

    return fullText;
  }

  const data = (await response.json()) as {
    content: Array<{ text: string }>;
  };
  return data.content[0].text;
}

// ===== 제품 이미지 분석 (Gemini Vision) =====
interface AnalyzeImagesInput {
  product: string[];
  package: string[];
}

interface AnalyzeImagesConfig {
  useBackend: boolean;
  backendUrl: string;
  geminiApiKey: string;
  authToken?: string;
}

interface ImageToAnalyze {
  type: 'product' | 'package';
  index: number;
  data: string;
}

export async function analyzeProductImages(
  images: AnalyzeImagesInput,
  config: AnalyzeImagesConfig
): Promise<ImageAnalysis | null> {
  const { useBackend, backendUrl, geminiApiKey } = config;

  const imagesToAnalyze: ImageToAnalyze[] = [];

  // 제품 이미지 수집 (최대 1장 - Vercel 용량 제한 대응)
  if (images.product && images.product.length > 0) {
    imagesToAnalyze.push({ type: 'product', index: 0, data: images.product[0] });
  }

  // 패키지 이미지 수집 (최대 1장)
  if (images.package && images.package.length > 0) {
    imagesToAnalyze.push({ type: 'package', index: 0, data: images.package[0] });
  }

  if (imagesToAnalyze.length === 0) return null;

  // Gemini Vision 요청 구성
  const parts: Array<
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }
  > = [
    {
      text: `당신은 이커머스 상품 분석 전문가입니다. 아래 제품/패키지 이미지를 분석하여 상세페이지 기획에 필요한 정보를 추출해주세요.

## 분석 항목 (JSON 형식으로 답변)

{
    "productAppearance": "제품의 외형, 색상, 형태, 크기감 묘사",
    "packageDesign": "패키지 디자인 스타일, 색상 톤, 고급감/캐주얼함 정도",
    "textFromImage": "이미지에서 읽을 수 있는 텍스트 (제품명, 성분, 특징 문구 등)",
    "productCategory": "추정되는 상세 카테고리 (예: 감자스낵, 초콜릿, 젤리 등)",
    "keyFeatures": ["이미지에서 파악되는 제품 특징 3~5가지"],
    "moodAndTone": "제품/패키지에서 느껴지는 분위기 (프리미엄/캐주얼/건강/재미 등)",
    "targetAudienceGuess": "이미지 기반 추정 타겟층",
    "colorPalette": ["주요 색상 3~4개"],
    "uniqueSellingPoints": ["시각적으로 강조된 USP 2~3가지"]
}

JSON만 출력하고 다른 설명은 하지 마세요.`,
    },
  ];

  // 이미지 압축 후 추가
  for (const img of imagesToAnalyze) {
    const compressed = await compressImageForAPI(img.data);
    const base64Data = compressed.replace(/^data:image\/\w+;base64,/, '');
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Data,
      },
    });
  }

  const url = useBackend
    ? `${backendUrl}/api/gemini`
    : `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

  const reqBody: Record<string, unknown> = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1500,
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
    throw new Error('이미지 분석 API 오류');
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
      return JSON.parse(jsonMatch[0]) as ImageAnalysis;
    }
  } catch (e) {
    console.warn('이미지 분석 JSON 파싱 실패:', e);
  }

  return null;
}
