import { fetchWithTimeout } from '@/shared/api/instance';
import { compressImageForAPI } from '@/features/image-generation/api/image-service';
import type {
  Section,
  Category,
  PriceRange,
  ImageAnalysis,
  SectionType,
} from '@/shared/types';
import { SECTION_TYPE_LABELS } from '@/shared/config/constants';

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
  imageAnalysis: ImageAnalysis | null = null,
  importedSectionTypes: SectionType[] | null = null
): string {
  const d = data;
  // 이미지 분석 결과 섹션 생성
  let imageAnalysisSection = '';
  if (imageAnalysis) {
    const packageColorInfo = (imageAnalysis.packageColors || []).length > 0
      ? `패키지 실제 색상: ${imageAnalysis.packageColors?.join(', ')}`
      : `패키지 색상: ${(imageAnalysis.colorPalette || []).join(', ') || '알 수 없음'}`;
    const productColorInfo = (imageAnalysis.productColors || []).length > 0
      ? `원물/내용물 실제 색상: ${imageAnalysis.productColors?.join(', ')}`
      : '';
    const packageTypeInfo = imageAnalysis.packageType
      ? `패키지 유형: ${imageAnalysis.packageType}`
      : '';

    imageAnalysisSection = `
### 제품 이미지 분석 결과 (AI Vision)
- 제품 외형: ${imageAnalysis.productAppearance || '분석 불가'}
- 패키지 디자인: ${imageAnalysis.packageDesign || '분석 불가'}
${packageTypeInfo ? `- ${packageTypeInfo}` : ''}- 이미지에서 읽은 텍스트: ${imageAnalysis.textFromImage || '없음'}
- 추정 상세 카테고리: ${imageAnalysis.productCategory || '알 수 없음'}
- 이미지 기반 제품 특징: ${(imageAnalysis.keyFeatures || []).join(', ') || '분석 불가'}
- 제품 분위기/톤: ${imageAnalysis.moodAndTone || '알 수 없음'}
- ${packageColorInfo}
${productColorInfo ? `- ${productColorInfo}` : ''}- 시각적 USP: ${(imageAnalysis.uniqueSellingPoints || []).join(', ') || '분석 불가'}

★★★ 비주얼 지시문의 색상은 반드시 위 분석 결과의 실제 색상만 사용하세요 ★★★
  - 패키지 색상: 위 "패키지 실제 색상"에 명시된 색상만 사용
  - 원물 색상: 위 "원물/내용물 실제 색상"에 명시된 색상만 사용
  - 이미지 분석에 없는 색상을 비주얼 지시에 창작하지 마세요
  - 예: 실제 패키지가 "흰색 봉지"인데 "밝은 노란색 패키지"로 쓰면 ✗`;
  }

  return `# 역할
당신은 한국 이커머스 상세페이지 전문 기획자입니다.
쿠팡, 네이버 스마트스토어에서 실제로 잘 팔리는 상세페이지를 분석하고,
"제품마다 다른 판매 전략"을 설계합니다.

# 핵심 미션
"${d.productName}" 상품의 상세페이지 기획서를 작성합니다.
레퍼런스 수준의 깊이와 제품별 맞춤 전략으로, 이 제품만의 최적 구조를 설계하세요.

## 제품 정보
- 제품명: ${d.productName}
- 카테고리: ${d.category}
- 가격 포지셔닝: ${d.priceRange}
- 핵심 타겟: ${d.targetAudience}
- 제품 특징: ${d.productFeatures || '(제공되지 않음 - 제품명과 카테고리 정보만으로 작성하되, 구체적 성분/수치/특성을 절대 추측하거나 날조하지 마세요)'}
- 추가 요청: ${d.additionalNotes || '없음'}
${imageAnalysisSection}
${importedSectionTypes && importedSectionTypes.length >= 8 ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 레퍼런스 기반 섹션 구성 (필수 준수)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

사용자가 ${importedSectionTypes.length}개의 레퍼런스 폴더를 임포트했습니다.
아래 섹션 타입 순서대로 정확히 ${importedSectionTypes.length}개 섹션을 생성하세요.
기존의 "8~12개" 제한을 무시하고, 아래 목록을 그대로 따르세요.

${importedSectionTypes.map((type, i) => `${i + 1}. [${type}] ${SECTION_TYPE_LABELS[type] || type}`).join('\n')}

★ 위 순서와 섹션 타입을 정확히 따르세요. 섹션을 추가하거나 빠뜨리지 마세요.
` : importedSectionTypes && importedSectionTypes.length > 0 ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 레퍼런스 참고 섹션
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

레퍼런스 폴더에서 다음 섹션 타입이 임포트되었습니다: ${importedSectionTypes.join(', ')}
이 타입들을 반드시 포함하되, 총 8개 이상의 섹션을 생성하세요.
` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 절대 금지 규칙 (최우선 준수)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 1. 수치/팩트 날조 금지
- 제품 정보에 명시되지 않은 수치는 절대 생성하지 마세요
- 플레이스홀더 형식: {칼로리}, {단백질함량}, {용량}, {가격} 등
- 단, 제품 정보에 명시된 수치는 적극 활용하세요 (비교 프레임, 인포그래픽 등)
- ★ 사용법/레시피의 구체적 수치도 날조 금지: 우림 시간, 물 온도, 섭취량, 조리 온도 등
  제품 정보에 없으면 "{우림시간}분", "{적정온도}℃" 등 플레이스홀더를 쓰세요
  예: "170도에서 구워낸" ✗ (온도 입력 없을 때), "3분이면 완성" ✗ (시간 입력 없을 때)
- ★ 설문 결과, 만족도 %, 판매 순위, 전통 연수 등 검증 불가한 수치 날조 금지
  예: "90%가 또 사고 싶다" ✗, "판매 1위" ✗, "600년 전통" ✗
- ★ 제품 정보에 없는 성분 특성 날조 금지
  예: "인공 감미료 무첨가" (입력에 없으면 ✗), "무방부제" (입력에 없으면 ✗)
- ★ 비교 차트/인포그래픽에서 다른 음료/식품의 구체적 수치를 지어내지 마세요
  예: "녹차 50mg, 커피 95mg" ✗ (일반 상식이라도 검증 불가 → 사용 금지)
  비교하려면: "{카페인 비교 데이터}" 플레이스홀더 또는 "카페인 프리 vs 일반 차류" 같은 정성적 비교만
- ★ 비주얼 지시문에서도 수치 날조 금지: "인증 표시", "인증서", "품질 인증 시각 요소" 같은 시각 요소도 입력에 없으면 사용 금지
- ★ 비교 차트/레이더 차트/맛 프로파일 차트에서 입력에 없는 맛/성분의 정량적 비교 데이터를 만들지 마세요
  예: "단맛/쓴맛/고소함 레이더 차트" ✗, "맛 프로필 인포그래픽" ✗, "풍미 밸런스 시각화" ✗
  예: "맛 특성 차트" ✗, "맛 프로파일" ✗ (수치화된 맛 비교 데이터 없을 때)
  비교하려면: 제품 정보에 있는 특성만 정성적으로 표현 ("달지 않은 쌉싸름한" 등)
  비주얼로는: 제품 실물 사진, 단면, 질감 등 물리적 촬영만 지시

### 1-1. 패키지/원물 색상 날조 금지
- ★★★ 비주얼 지시문에서 패키지나 제품의 색상을 이미지 분석 결과와 다르게 쓰지 마세요 ★★★
- 이미지 분석에서 "흰색 봉지"로 나왔는데 "노란색 패키지"로 쓰면 ✗
- 이미지 분석에서 "베이지색 과자"로 나왔는데 "갈색 과자"로 쓰면 ✗
- 배경색은 자유롭게 설정 가능하지만, 제품/패키지 자체 색상은 실제와 동일해야 합니다
- 예: "밝은 노란색 배경의 두부과자" → 배경이 노란색인 건 OK, 패키지가 노란색이라는 뜻이면 ✗

### 2. 입력에 없는 정보 창작 금지
- 제품 정보에 없는 맛, 라인업, 제조공법, 성분, 인증을 지어내지 마세요
- 특허, 인증마크, 수상 경력, 허위 전문가 추천을 만들지 마세요
- 라인업 존은 제품 정보에 맛/종류가 명시된 경우에만 생성하세요

### 3. 과장 표현 금지
- 금지 단어: 완벽한, 혁신적, 게임체인저, ~의 정답, ~의 새로운 기준, 진짜
- ★★★ "진짜"는 헤드라인, 서브카피, 대안, 브릿지, 컷 설명 등 기획서 전체에서 완전 금지입니다 ★★★
  - "진짜 고소함" ✗, "진짜 바삭함" ✗, "진짜 말차" ✗, "진짜 리뷰" ✗, "진짜 맛" ✗, "진짜 구수함" ✗
  - "진짜 쌉싸름" ✗, "진짜 교토" ✗, "진짜 보리" ✗, "진짜 두부" ✗, "진짜 간식" ✗
  - 대체어: "제대로 된", "확실한", "본연의", "있는 그대로의"
  - ★ "진짜"는 카피 프레임뿐 아니라 서브카피, 대안, 컷 설명 어디서든 사용 금지입니다
- ★★★ "완벽한/완벽"도 기획서 전체에서 완전 금지입니다 ★★★
  - "완벽한 만남" ✗, "완벽한 조합" ✗, "완벽할 줄이야" ✗, "완벽한 밸런스" ✗
  - ★ 대안(헤드라인대안, 서브카피대안)에서도 절대 사용 금지
  - 대체어: "충분한", "확실한", "제대로 된", "딱 맞는"
- 금지 관용구: 두 마리 토끼, 일석이조 (★ 헤드라인 대안, 서브카피 대안에서도 사용 금지)
- 금지 버즈워드: 헬시 플레저, 스마트 초이스
- "프리미엄"은 구체적 근거 없이 단독 사용 금지

### 4. 강압적 CTA 금지
- 금지: "놓치지 마세요", "서두르세요", "지금 바로 구매하세요", "선택이 아닌 필수"
- ★ 모든 섹션의 대안(헤드라인대안, 서브카피대안)에서도 위 표현 절대 사용 금지
- ★ "한정 수량", "지금 아니면" 같은 긴급성 유발 표현도 금지
- 허용: 부드러운 제안형 ("한번 드셔보시면 알게 돼요", "이런 맛도 있어요")

★★★ 핵심 원칙: "대안도 본문과 동일한 규칙 적용" ★★★
헤드라인대안 5개, 서브카피대안 5개는 "대안이니까 좀 더 자유롭다"가 아닙니다.
금지 단어, 약점 수치 수식, 강압적 CTA, 날조 수치 — 모든 규칙이 대안에도 동일하게 적용됩니다.
★ 대안에서 가장 자주 누출되는 금지 표현:
  - "완벽한/완벽할/완벽하게" → "딱 맞는", "제대로 된"
  - "놓치지 마세요" → "한번 만나보세요", "이런 맛도 있어요"
  - "깊은 맛/풍부한 맛" (10% 미만 원료) → "더한 고소함", "넣어 고소한"
  - "부담스럽지 않아요/부담 없이" (고칼로리 제품) → 칼로리 관련 표현 자체 회피
대안을 작성한 후 각 대안이 모든 금지 규칙을 준수하는지 반드시 확인하세요.
★ 섹션명(섹션명: 필드)에서도 "완벽한", "놓치지" 같은 금지 표현 사용 금지

### 5. 약점 수치 과대포장 금지
- 수치가 객관적으로 약한 경우, 그것을 강점처럼 프레이밍하지 마세요
- 예시:
  - 두부 5.14% → "깊은 콩 풍미" ✗ → "콩을 더해 고소한 맛" ○ (있는 그대로)
  - 단백질 3g/42g → "단백질이 풍부한" ✗ → 단백질을 셀링포인트로 사용 자체를 하지 마세요
  - 215kcal/42g → "부담 없는 칼로리" ✗ → 칼로리를 강점으로 내세우지 마세요
- 판단 기준:
  - 함량 비율 10% 미만인 원료 → "풍부한/깊은/진한/풍성한/깊이감" 수식 절대 금지
  - 허용 수식: "더한", "넣은", "살짝", "은은한" 정도만
  - ★★★ 이 수식 금지는 대안(헤드라인대안, 서브카피대안), 서브카피, 컷 설명 어디서든 동일 적용 ★★★
  - ★ "깊은"이라는 단어를 10% 미만 원료의 맛을 묘사할 때 절대 사용하지 마세요
    "깊은 맛" ✗, "깊은 고소함" ✗, "깊이감" ✗, "깊은 풍미" ✗
    → "은은한 고소함" ○, "더한 고소함" ○, "콩을 넣어 고소한" ○
  - 예: 두부 5.14% → "깊은 맛" ✗, "풍부한 맛" ✗, "깊고 풍부한" ✗, "풍성한 맛" ✗
    → "더한 고소함" ○, "은은한 콩 향" ○, "넣어 고소한" ○
  - 칼로리 판단 시 반드시 100g 기준으로 환산하세요 (예: 215kcal/42g → 약 512kcal/100g)
  - 100g당 칼로리 400kcal 초과 → "가벼운/부담 없는/가볍게" 및 칼로리 수치 자체를 강점처럼 사용 금지
  - ★ 이 규칙은 헤드라인 대안, 서브카피 대안에서도 동일하게 적용됩니다. 대안이라도 위반 표현을 생성하지 마세요
  - ★ "215kcal의 부담 없는 OO", "215kcal로 안심하고" 같은 표현은 절대 금지입니다
  - ★ 215kcal/42g은 100g 기준 약 512kcal로 고칼로리입니다. 칼로리를 긍정적 맥락에서 언급하지 마세요
  - ★ 칼로리 수치를 체크마크(✓), 인포그래픽, 건강 지표와 함께 나열하는 것도 긍정적 프레이밍에 해당합니다
  - ★ 100g당 400kcal 초과 제품은 칼로리 수치 자체를 비주얼/증거컷에 표시하지 마세요
  - ★★★ 100g당 400kcal 초과 제품: 칼로리를 POINT의 일부로 포함하는 것도 금지 ★★★
    "편리함", "적당한 양", "한 봉지" 같은 프레이밍으로 칼로리를 은근히 긍정화하지 마세요
    예: POINT 3 "편리한 한입 + 215kcal" ✗ → 칼로리는 POINT에서 완전히 배제하세요
    칼로리 수치는 FAQ에서 중립적으로 "{칼로리}" 플레이스홀더로만 언급 가능
  - ★ "부담스럽지 않아요", "부담 없이 즐기세요" 같은 간접적 칼로리 긍정화도 금지
    "한 번에 다 먹어도 부담스럽지 않아요" ✗ → 칼로리 관련 안심 프레이밍 자체를 하지 마세요
  - 1회 제공량 기준 단백질 5g 미만 → 단백질을 셀링포인트로 사용 금지, 언급 자체를 하지 마세요
  - 약한 수치는 셀링포인트에서 제외하고, 제품의 실제 강점에 집중하세요

### 6. 입력에 없는 인증/정책 날조 금지
- HACCP, ISO, GMP 등 인증을 제품 정보에 명시되어 있지 않으면 절대 생성하지 마세요
- "100% 환불", "무료 체험", "교환 보장" 등 판매 정책을 만들지 마세요
- "인증서", "시험성적서", "검사 결과" 등을 창작하지 마세요
- FAQ 답변에서도 입력에 없는 인증/정책을 지어내지 마세요

### 8. 섹션 간 중복 금지
- 같은 수치(예: "5.14%", "215kcal")를 2개 이상 섹션에서 반복하지 마세요. 한 번 강조한 수치는 다른 섹션에서 재사용하지 않습니다.
- 연속된 섹션에서 같은 의성어/키워드(예: "오독오독", "바삭바삭")를 헤드라인으로 반복하지 마세요. 다양한 표현을 사용하세요.
- 같은 USP를 2개 이상 섹션에서 메인 소구점으로 사용하지 마세요. 각 섹션은 고유한 관점/메시지를 가져야 합니다.

### 9. 모바일 가독성 필수 지시
- 이 상세페이지는 모바일(스마트폰)에서 주로 열람됩니다.
- visualPrompt에 반드시 포함: "헤드라인은 화면 폭의 80% 이상을 차지하는 큰 글씨로, 서브카피는 헤드라인의 60% 크기로, 본문/부가정보는 서브카피의 70% 크기로 작성. 모든 텍스트는 모바일에서 명확히 읽을 수 있어야 함."
- 한 섹션에 텍스트 항목이 5개를 초과하지 않도록 정보량을 조절하세요. 정보가 많으면 2개 섹션으로 분리하세요.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 기획 전 필수 분석 (STEP 0~5)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

각 STEP을 간결하게 핵심만 작성하세요.

### STEP 0: 제품 유형 분류 & 페이지 구조 결정 ★NEW★

아래 기준으로 선택 섹션 포함 여부를 판단하세요:

A. 식감/촉감 등 감각적 특성이 강한 제품 → 임팩트 타이포(impact-typo) 포함
B. 다양한 상황(소풍, 사무실, 캠핑 등)에서 사용 가능 → 상황 연출(situation) 포함
C. 가격 앵커링이나 자주 묻는 질문이 필요 → FAQ(faq) 포함
D. 초콜릿/소스/치즈 등 풍미/질감이 핵심인 제품 → 씨즐컷(sizzle) 포함

복수 선택 가능. 선택한 유형에 따라 아래 "선택적 섹션"을 페이지에 포함하세요.

★ 페이지 구조 결정 규칙 ★
필수 섹션: 히어로(hero) + 공감(empathy) + POINT(2~3개) + 라이프스타일(lifestyle) + 리뷰(review) + CTA
선택 섹션 (해당 시 포함):
- [씨즐컷(sizzle)]: 초콜릿/소스/치즈 등 풍미/질감이 핵심인 제품 → hero와 point 사이에 배치
- [임팩트 타이포(impact-typo)]: 식감/촉감 등 감각적 특성이 강한 제품 → empathy 뒤에 배치
- [비교(comparison)]: 경쟁 제품 대비 차별점이 있는 경우 → POINT 뒤에 배치
- [신뢰/인증(trust)]: HACCP, 수상, 인증 등이 있는 경우 → comparison 뒤에 배치
- [전환 브릿지(divider)]: 섹션 전환이 필요한 곳 → 중간 전환점에 배치
- [상황 연출(situation)]: TPO가 다양한 제품 → 라이프스타일 뒤에 배치
- [사용법/레시피(recipe)]: 조리법이나 활용법이 있는 경우 → situation 뒤에 배치
- [FAQ(faq)]: 가격 앵커링이나 CS 질문이 필요한 경우 → CTA 직전에 배치
- [제품 정보(spec)]: 법적 필수 고지사항 → 항상 마지막에 배치

${importedSectionTypes && importedSectionTypes.length >= 8
? `★ 레퍼런스 기반 배치 순서 (위의 "레퍼런스 기반 섹션 구성"을 따르세요) ★
총 섹션 수: 정확히 ${importedSectionTypes.length}개 (레퍼런스 폴더 수에 맞춤)`
: `★ 검증된 배치 순서 ★
hero → empathy → comparison → point(2~3개) → [impact-typo] → lifestyle → [situation] → review → [faq] → cta
${importedSectionTypes && importedSectionTypes.length > 0 ? `\n★ 레퍼런스 폴더가 ${importedSectionTypes.length}개 있습니다. 이 섹션 타입(${importedSectionTypes.join(', ')})을 반드시 포함하되, 나머지는 위 배치 순서에서 추가하여 총 8개 이상으로 구성하세요.` : ''}
총 섹션 수: 정확히 8개 이상 생성하세요. 8개 미만은 절대 불가합니다.
★★★ 반드시 8개 이상의 [SECTION_START]...[SECTION_END] 블록을 출력하세요 ★★★`}
각 섹션 = 1장의 AI 생성 이미지.

### STEP 1: 핵심 셀링 포인트 도출

★ POINT 수는 제품 복잡도에 따라 ★
- 단순 제품 (보리차, 생수, 티슈 등): 2개 POINT
- 일반 제품 (과자, 음료, 간식 등): 3개 POINT
- 복합 제품 (건강식품, 화장품, 가전 등): 4개 POINT

★ POINT가 될 수 없는 것들 ★
- 편의성, 휴대성, 용량, 포장, 크기 → 사용 시나리오 섹션이나 FAQ에서 처리
- 만족감, 행복, 든든함 같은 추상적 감정 → 결과이지 셀링포인트가 아님
- POINT는 "제품의 물리적·감각적·기능적 고유 특성"만 가능

★ 약점 수치 필터링 ★
- POINT 도출 전, 제품 정보의 각 수치를 금지 규칙 5번으로 검증
- 검증 실패한 수치는 POINT에서 제외
- 예: 두부 5.14% → 원료를 POINT로 쓸 수 있지만 "진한/풍부한" 수식 금지
- 예: 단백질 3g → POINT로 사용 불가, 언급 자체를 하지 마세요
- 예: 215kcal/42g → 100g 기준 512kcal이므로 칼로리를 POINT로 사용 불가

각 POINT 정의 시:
- POINT별 고유 키워드 1개 (다른 POINT에서 사용 금지)
- "이 제품을 사는 사람의 구체적 상황" 묘사
- 기존 대안 대비 실질적 장점

### STEP 2: 설득 깊이 설계

각 POINT는 하나의 완결된 설득 흐름:
1. 공감 - 고객의 구체적 상황/고민
2. 솔루션 - 이 제품이 어떻게 해결하는지
3. 증거 - 근거 (성분, 비교, 공정 등. 입력에 있는 팩트만)

★ 핵심 POINT 다중 증거 전략 ★NEW★
- 가장 강한 POINT 1개는 증거를 2가지 앵글로 제시 (증거컷 2개)
  예: 닭가슴살 단백질 → ①달걀 비교 인포그래픽 ②일일 권장량 대비 차트
  예: 교토산 말차 → ①일반 녹차 파우더 색상/향 비교 ②교토 다원 원산지 증명
- 나머지 POINT는 증거컷 1개 유지

★ 다중 타겟 반영 규칙 ★
- 타겟이 2개 이상일 경우:
  - 공감컷을 타겟별로 분배 (모두 같은 타겟으로 채우지 말 것)
  - 타겟이 1개라도, 공감컷 상황을 매번 다르게

### STEP 3: 구매 저항 분석 ★NEW★

이 제품에 대해 타겟이 가질 수 있는 부정적 선입견 2~3개를 식별하세요.
(예: "두부과자 = 맛없을 것 같다", "보리차 = 어르신 음료", "말차 = 쓸 것 같다")

각 저항에 대해:
- 어느 섹션/컷에서 해소할지 결정
- 해소 방식: 선제부정형("OO한 맛? NO!"), 비교형, 증거제시형 중 선택
- STEP 0에서 [저항 선제해소 섹션]을 별도로 둘 만큼 강한 저항이 있으면 독립 섹션으로

### STEP 4: 카피 전략 설계

★ 카피 프레임워크 ★
전체 상세페이지를 관통하는 고유 카피 프레임을 만드세요.
- 이 제품에서만 쓸 수 있는 고유한 프레임이어야 합니다
- 금지 프레임: "진짜 OO", "OO의 시작", "OO하게 채웠다", "새로운 OO"
- 프레임은 제품의 가장 강력한 셀링포인트에서 파생

★ 카피 전략 유형 (1개 이상 선택) ★NEW★
A. 노스탤지어형: 타겟이 공유하는 문화적 기억 활용 (예: "어릴 때 그 맛", "엄마가 끓여주던")
B. 밈/컬처형: MZ 타겟에 바이럴될 재치있는 표현 (예: "초코국밥", "말차 덕후")
C. 도발형: 경쟁사 대비 자신감 표현 (예: "비교해주세요", "한번 먹어보면 안다")
D. 과학형: 성분/공법 메커니즘 구체 설명 (예: "유청단백+카제인단백 듀얼 설계")
E. 루틴형: 일상 속 사용 타이밍 제안 (예: "아침 한 잔, 오후 한 잔, 잠들기 전 한 잔")
F. 저항전복형: 부정적 선입견을 먼저 언급하고 뒤집기 (예: "비릿한 맛? 그건 옛날 얘기")
→ 단순 기능 나열("OO해서 좋은")은 금지. 반드시 위 유형 중 1개 이상 적용하세요.
→ 선택한 유형을 명시하세요.

★ 프레임 키워드 변주 규칙 ★
- 프레임 원형 키워드: 전체 메인 헤드라인에서 최대 2회
- 유의어/변주어도 동일한 단어가 최대 2회
- ★ 원형 + 유의어를 합산하여 같은 의미의 단어가 전체 헤드라인의 50% 이상에 등장하면 안 됩니다
  예: 8섹션이면 같은 의미 키워드가 4개 이상 헤드라인에 등장 → 과다
  예: "교토" 2회 + "본고장" 2회 + "현지" 1회 = 같은 의미 5회/8헤드라인 → ✗ 과다
  → "교토" 2회 + 나머지 3개는 프레임 키워드 없이 독립적 헤드라인으로 구성 → ○
- 나머지 헤드라인: 프레임 키워드 없이 POINT의 고유 주제로 작성
- ★ "모든 헤드라인에 프레임 키워드 필수"가 아닙니다. 프레임 키워드가 없는 독자적 헤드라인도 OK

### STEP 5: 비주얼 톤 & GIF 설계

★ 비주얼 톤 시스템 ★NEW★
페이지 전체의 통일된 비주얼 톤을 1줄로 정의하세요.
예: "따뜻한 베이지 톤, 내추럴 감성, 자연광 위주"
예: "비비드 레트로, 네온 포인트, 팝한 스타일링"
예: "클린 화이트 + 민트 포인트, 미니멀 프리미엄"
→ 이 톤이 모든 컷의 배경/조명에 일관되게 적용되어야 합니다.

★ GIF 필요 구간 판단 ★
- 적합: 부서지는 식감, 따르는 장면, 코팅 과정, 거품, 사용 시연, 제조 과정
- 부적합: 인포그래픽 애니메이션, 그래프 모션, 모핑, 텍스트 효과
- 전체 GIF 최대 3개

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 섹션 유형별 구성 가이드
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

★★★ 핵심: 각 섹션 = 1장의 이미지 ★★★
각 섹션은 AI 이미지 생성으로 1장의 긴 세로 이미지로 만들어집니다.
"컷"은 이미지 안에서의 영역/구성을 의미합니다 (별도 이미지가 아님).

${importedSectionTypes && importedSectionTypes.length >= 8
? `★★★ 레퍼런스 기반 섹션 구조 (필수) ★★★
위 "레퍼런스 기반 섹션 구성"에 명시된 ${importedSectionTypes.length}개 섹션을 순서대로 생성하세요.`
: `★★★ 기본 설득 구조 (검증된 흐름) ★★★
히어로 → 공감 → 비교 → POINT(2~3개) → [임팩트 타이포] → 라이프스타일 → [상황 연출] → 리뷰 → CTA
[ ] = 선택적 섹션. 총 8개 이상 섹션. 8개 미만 절대 불가.`}

### [hero] 히어로 (필수, 1장)
- 제품의 핵심 USP + 패키지 비주얼이 통합된 첫인상 이미지
- 제품명, 핵심 카피, 뱃지가 디자인된 타이포그래피로 포함
- 패키지 이미지를 크고 선명하게 배치
- 카피 톤: 감각적 한마디 (의성어/의태어 + 제품명) 또는 핵심 베네핏 선언
  - 좋은 예: "오독오독 두부과자", "한 모금에 퍼지는 보리향"
  - 나쁜 예: "새로운 맛의 시작", "당신을 위한 특별한 선택" (뻔한 선언)

### [empathy] 공감 (필수, 1장)
- ★★★ 공감 카피의 핵심 = "구체적 장면 묘사" ★★★
- 반드시 시간/장소/행동 중 2개 이상을 포함한 구체적 일상 장면으로 시작
- 타겟이 "아, 나도 그래!" 하고 무릎을 치는 순간을 포착
- 라이프스타일 사진 + 공감 카피가 결합
- ★ 비주얼 지시문에 인물이 제품과 상호작용하는 모습을 반드시 포함 (들기, 먹기, 꺼내기, 바라보기)
- ★ 제품이 단순히 테이블에 놓여있기만 하면 안 됨 — 손에 들거나 입에 가져가는 동작 필수
- 카피 톤: 친구에게 말하듯 자연스러운 대화체, 과도한 수사 없이
  - 좋은 예: "편의점 과자 코너에서 성분표 뒤집어본 적 있나요"
  - 좋은 예: "오후 3시, 책상 위 과자 봉지가 자꾸 눈에 밟힐 때"
  - 좋은 예: "아이 도시락에 뭘 넣어야 할지 매일 아침 고민이라면"
  - 나쁜 예: "건강한 간식을 찾고 계신가요?" (100개 제품에 쓸 수 있는 카피)
  - 나쁜 예: "맛과 건강, 두 마리 토끼를 잡고 싶다면?" (클리셰 딜레마 구조)
  - 나쁜 예: "과자는 먹고 싶은데 건강은 챙기고 싶다면?" (추상적 가치 대립)
- ★ "X는 하고 싶은데 Y는 챙기고 싶다면?" 패턴 사용 금지 — 너무 뻔함
- ★ "~을 찾고 계신가요?", "~이 고민이신가요?" 단독 사용 금지 — 구체적 장면 없이 질문만 던지면 ✗

### [comparison] 비교 (필수, 1장)
- 일반 제품/기존 방식 vs 이 제품의 시각적 비교
- 좌우 또는 상하 분할로 차이를 명확히 표현
- 일반 쪽: 저채도/흑백, 이 제품 쪽: 선명한 컬러
- VS 타이포를 대형으로 디자인
- ★ 비교 항목은 제품 정보에서 도출된 실제 차이점만 사용
- 카피 톤: 팩트 중심의 냉정한 비교, 감정 과잉 금지
  - 좋은 예: "밀가루+설탕 vs 밀가루+감자+옥수수+두부"
  - 나쁜 예: "일반 과자 vs 두부과자, 선택은?" (결론 없는 질문)

### [point] 포인트 (필수, 2~3장)
- POINT.01, POINT.02... 넘버링 라벨 + 헤드라인이 디자인된 타이포
- 각 포인트는 고유한 셀링 포인트 1개에 집중
- 핵심 수치/키워드를 초대형 디자인 타이포로 강조
- 제품 클로즈업, 원재료, 성분 비교 등 증거 시각화 포함
- ★ 포인트 간 내용 중복 금지
- 카피 톤: 증거 기반 선언 (감각 묘사 + 근거)
  - 좋은 예: "표면의 작은 구멍들이 만드는 특별한 식감"
  - 나쁜 예: "한 번 먹으면 멈출 수 없는 바삭함" (과장 클리셰)
  - ★ "한 번 ~하면 멈출 수 없는" 패턴 금지 — 모든 과자가 쓰는 상투구

### [impact-typo] 임팩트 타이포 (선택, 1장)
- 핵심 키워드 1~2개를 화면 가득 채우는 초대형 디자인 타이포
- 의성어/의태어 활용 (바삭, 오독오독, 촉촉 등)
- 제품 이미지 없이 순수 타이포만으로 시각적 임팩트
- 스크롤 중 정보 피로를 해소하는 "시각적 쉼표" 역할
- POINT 사이 또는 POINT 뒤에 배치
- 카피 톤: 짧고 강렬 (3~6자), 설명 없이 감각만
  - 좋은 예: "오독오독", "바삭!", "콩을 깨물다"
  - 나쁜 예: "건강한 바삭함" (추상 개념 조합), "죄책감 ZERO" (근거 없는 감정 조작)

### [sizzle] 씨즐컷 (선택, 1장)
- 제품의 식감/풍미/질감을 극대화하는 매크로 클로즈업 전용 섹션
- 초콜릿이 녹아 흐르는, 치즈가 늘어나는, 과즙이 터지는 등 "맛있는 순간" 포착
- 제품 단면, 코팅 질감, 윤기나는 표면 등 감각을 자극하는 비주얼
- hero와 point 사이에 배치 → "이게 뭐야?" → "이렇게 맛있어!" → "이런 특장점" 흐름
- 식품 제품에서 특히 효과적 (초콜릿, 치즈, 소스류 등 질감이 중요한 제품)
- 카피 톤: 감각 묘사 (3~8자)
  - 좋은 예: "녹진한 초코", "촉촉한 한 입", "흐르는 풍미"
  - 나쁜 예: "맛있는 초코콘" (단순 서술), "최고의 맛" (과장)

### [lifestyle] 라이프스타일 (필수, 1장)
- 실제 사용 장면 (가족 간식, 혼자 티타임, 사무실 등)
- 제품이 생활 속에서 자연스럽게 사용되는 모습
- 감성적인 디자인 타이포 (감탄사, 일상적 톤)
- 구매 후 일상의 변화를 시각화
- 카피 톤: 구체적 상황 나열 (구매 후 일상의 "장면"을 보여줌)
  - 좋은 예: "오후 간식으로 | 아이 도시락에 | 야근할 때 한 봉지"
  - 나쁜 예: "언제 어디서나 부담 없이" (모든 제품에 쓸 수 있는 카피)
  - ★ "언제 어디서나" 단독 사용 금지 — 구체적 TPO(시간/장소/상황) 3개 이상 나열

### [situation] 상황 연출 (선택, 1~2장)
- 특정 TPO(시간/장소/상황)에서의 제품 활용
- 전체 화면 라이프스타일 사진 + 캡션 타이포
- 예: 소풍, 캠핑, 사무실, 거실 등 구체적 상황
- 라이프스타일 섹션과 다른 상황으로 구성

### [review] 리뷰 (필수, 1장)
- 구매자 후기를 카드/말풍선 형태로 시각화
- 별점 그래픽 + 리뷰 텍스트 + 프로필 아이콘
- ★ 제품 정보에 실제 후기가 없으면 "{실제 구매 후기 1}" 플레이스홀더 사용
- ★ 구체적 후기 문장을 지어내지 마세요
- ★ 만족도 수치 임의 생성 금지

### [faq] FAQ (선택, 1장)
- 3~5개 Q&A를 카드/아코디언 형태로 시각화
- 실제 CS 질문 위주, 가격 앵커링도 여기서 처리
- ★ 답변에서 입력에 없는 정보 날조 금지

### [trust] 신뢰/인증 (선택, 1장)
- HACCP, ISO, 유기농 등 인증 마크/인증서 배치
- 수상 이력, 판매량, 만족도 등 사회적 증거
- 원산지 증명, 임상 데이터, 연구 결과
- ★ 입력에 없는 인증/수상 정보 날조 금지

### [divider] 전환 브릿지 (선택, 1장)
- 제품 누끼를 다양한 각도로 플로팅 배치
- 텍스트 최소화 ("여기서 잠깐!" 등 짧은 전환 카피)
- 섹션 전환 시 시각적 환기/스크롤 피로 방지
- 깔끔한 단색 배경에 제품이 공중에 떠다니는 구도

### [recipe] 사용법/레시피 (선택, 1장)
- 조리법, 섭취법, 활용법을 Step 1/2/3 넘버링으로 안내
- 각 단계별 사진 + 설명
- 완성된 결과물을 크게 보여주기
- "이렇게 즐겨보세요!" 류의 친근한 톤

### [cta] CTA (필수, 1장)
- 부드러운 구매 유도 + 제품 패키지 프리미엄 배치
- 감성적 마무리 카피를 디자인 타이포로
- 히어로와 같은 카피 반복 금지
- CTA 버튼 그래픽 포함
- 카피 톤: 앞 섹션의 핵심 감각/경험을 한 문장으로 요약, 새로운 제안
  - 좋은 예: "오독오독한 간식 시간, 오늘부터"
  - 나쁜 예: "지금 바로 시작하세요" (모든 상품 CTA 공용)

### [spec] 제품 상세정보 (선택, 1장)
- 제품명, 원재료명, 영양정보, 제조원 등 법적 필수 표기
- 깔끔한 표 형태로 정리
- 제품 패키지 정면 사진과 함께 배치
- ★ 입력에 없는 영양정보/원재료 날조 금지

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 카피라이팅 원칙
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 헤드라인 (10~18자)
- 카피 프레임 키워드를 적절히 배치 (전체 헤드라인의 30~50%에 포함)
- ★ 모든 헤드라인에 프레임 키워드를 강제하지 마세요 — 과반수 이하로 자연스럽게 배치
- 감각적, 구체적, 호기심 유발
- 단순 기능 나열형 헤드라인 금지 ("OO함유", "OO% 사용" 식은 팩트기반 대안에만)

### 서브카피 (25~50자)
- 헤드라인의 근거 제시 또는 감성 확장, 50자 초과 금지

### 대안 5개 (헤드라인/서브카피 각각)
1. 감각 묘사형 (오감)
2. 상황 제시형 (언제/어디서/누구와)
3. 질문형
4. 대비/반전형
5. 팩트 기반형 (입력 정보 기반만)
★ 각 대안은 "이것만 봐도 사고 싶어지는" 수준이어야 함
★ 팩트 기반형도 수치를 비교 프레임으로 전환: "두부 5.14% 함유" ✗ → "콩을 갈아 넣어 구운" ○

### ★★★ 클리셰 카피 구조 금지 ★★★
아래 패턴은 너무 많은 제품에서 반복되어 소비자가 무시하는 카피입니다. 절대 사용 금지:

금지 패턴 1: 추상적 가치 대립 질문
  - "X는 하고 싶은데 Y는 챙기고 싶다면?" ✗
  - "맛과 건강, 두 마리 토끼?" ✗
  - → 대신: 구체적 일상 장면을 묘사하세요 ("편의점 과자 앞에서 성분표 뒤집어본 적 있으시죠")

금지 패턴 2: 제품 무관 범용 질문
  - "건강한 간식을 찾고 계신가요?" ✗
  - "OO이 고민이신가요?" ✗ (단독 사용 시)
  - → 대신: 이 제품만의 구체적 상황을 그리세요

금지 패턴 3: 과장 관용구
  - "한 번 먹으면 멈출 수 없는" ✗
  - "입안 가득 퍼지는" ✗
  - "한입에 반하는" ✗
  - → 대신: 실제 제품 특성에서 나오는 묘사 ("표면의 작은 구멍들이 만드는 식감")

금지 패턴 4: 범용 수식 조합
  - "새로운 맛의 시작" ✗
  - "당신을 위한 특별한 선택" ✗
  - "언제 어디서나 부담 없이" ✗ (구체 TPO 없이 단독 사용)
  - → 대신: 이 제품에만 해당하는 구체적 표현

★ 자가 검증: 작성한 카피에서 제품명을 지워도 다른 제품에 쓸 수 있다면, 그건 클리셰입니다. 다시 쓰세요.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 비주얼 지시 원칙
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 금지
- 한국어 텍스트 정확 렌더링 (이미지에 직접 포함, 후처리 아님)
- 콜라주/몽타주 합성 금지
- 물체 공중 부유 금지
- 모핑/변환/3D 효과 금지

### 비주얼 다양성 규칙 ★NEW★
- "스튜디오 조명 + 화이트 배경"은 전체 컷의 30% 이내
- 반드시 포함할 비주얼 유형:
  ① 사용 시연컷 (먹는/쓰는/만드는 과정)
  ② 상황 연출컷 (구체적 시간/장소에서의 사용)
  ③ 디테일 매크로컷 (질감, 단면, 표면 등)
  ④ 비교 대조컷 (경쟁 대안 또는 Before/After)
- STEP 5에서 정의한 비주얼 톤이 모든 컷에 일관되게 적용

### 제품 고유 비주얼 묘사
- 비주얼 지시문에 "이 제품의 실제 외형"을 구체적으로 묘사
- 이미지 분석 결과가 있으면 그 정보를 정확히 반영
- 범용 묘사 금지: "만족하는 표정의 인물", "과자를 들고 있는 손"

### GIF (Y인 경우)
- 촬영 방식, 카메라 앵글, 동작 설명, 예상 길이 (2~3초)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 출력 형식
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

먼저 STEP 0~5 분석을 작성한 후, 섹션을 출력하세요.

[SECTION_START]
섹션번호: N
섹션명: 실제 섹션 이름
섹션유형: hero / empathy / comparison / point / impact-typo / sizzle / lifestyle / situation / review / faq / cta / flavor / closeup / product-cut / lineup / recipe / trust / spec / bundle
목적: 이 섹션이 판매에 기여하는 방식
헤드라인: (10~18자)
헤드라인대안: 감각묘사 | 상황제시 | 질문형 | 대비반전 | 팩트기반
서브카피: (25~50자)
서브카피대안: 감각묘사 | 상황제시 | 질문형 | 대비반전 | 팩트기반
비주얼 지시: 이미지 생성 AI가 이 섹션의 1장 이미지를 만들기 위한 상세 지시문 (STEP 5 비주얼 톤 반영, 레이아웃 구성, 제품 배치, 배경 톤, 그래픽 요소 모두 포함)
비주얼지시대안: 스타일A | 스타일B | 스타일C | 스타일D | 스타일E (각각 다른 구도·조명·분위기·연출 방식으로 작성, | 구분)
브릿지: 궁금증 유발 1줄 (마지막 섹션은 빈칸)
[SECTION_END]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 최종 자기검증
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[VALIDATION]
★★★ 최우선 금지 단어 전수 검사 (섹션별로 수행) ★★★
기획서의 모든 텍스트(헤드라인, 서브카피, 대안 5개, 브릿지, 비주얼 지시, 목적)를 섹션별로 하나씩 검색하세요.

검색 대상 금지 단어:
- "진짜" → 대체: "제대로 된", "확실한", "본연의"
  ★ "진짜"는 한국어에서 무의식적으로 자주 나오는 단어입니다. 반드시 모든 대안 텍스트까지 검색하세요.
- "완벽한" / "완벽" / "완벽할" → 대체: "충분한", "확실한", "제대로 된", "딱 맞는"
  ★ "완벽한 만남" ✗, "완벽한 조합" ✗, "완벽할 줄이야" ✗ — 대안에서도 절대 금지
- "혁신적", "게임체인저", "~의 정답", "~의 새로운 기준"
- "놓치지 마세요", "서두르세요", "지금 바로 구매하세요", "선택이 아닌 필수"
- "두 마리 토끼", "일석이조"
- "헬시 플레저", "스마트 초이스"

검색 결과를 아래 형식으로 섹션별 보고하세요:
  섹션1 헤드라인: OK / 서브카피: OK / 대안: "진짜" 1회 발견 → 수정 필요
  섹션2 헤드라인: OK / 서브카피: OK / 대안: OK
  ...
  합계: "진짜" N회, "완벽" N회, 기타 N회

★★★ 프레임 키워드 반복 전수 검사 ★★★
모든 섹션의 메인 헤드라인을 나열하고, 프레임 원형 키워드 및 그 유의어/변주어가 각각 몇 회 등장하는지 세세요.
- 원형 키워드: 최대 2회 (3회 이상이면 변주어로 교체)
- ★ 유의어/변주어도 동일한 단어가 3회 이상 반복되면 교체 (예: "본고장" 3회 → 2회로 줄이기)
예:
  섹션1: "교토에서 온 맛" → 교토 1회
  섹션2: "본고장의 깊은 향" → 본고장 1회
  ...
  합계: 교토 N회 (2회 이하여야 함)

★★★ 약점 수치 전수 검사 ★★★
단백질 5g 미만인 제품: "단백질"이라는 단어가 긍정적 맥락으로 등장하는지 전체 검색하세요. 발견 시 삭제.
100g당 400kcal 초과인 제품: 칼로리 수치가 긍정적 맥락으로 등장하는지 전체 검색하세요. 발견 시 삭제.
★ 대안 텍스트, 비주얼 지시에서도 반드시 검색하세요.

★★★ 날조 검사 ★★★
- 제품 정보에 없는 인증(HACCP, ISO, GMP 등)이 기획서에 등장하는가?
- 제품 정보에 없는 판매 정책(환불, 무료 체험 등)이 등장하는가?
- 제품 정보에 없는 인증서/시험성적서가 등장하는가?
- FAQ 답변에서 입력에 없는 정보를 지어낸 곳이 있는가?
→ 발견 시 플레이스홀더로 교체하거나 해당 내용 삭제

★★★ 구조 검증 ★★★
- STEP 0에서 선택한 유형에 해당하는 선택 섹션이 실제로 포함되었는가?
- hero → empathy → comparison → point → lifestyle → review → cta 순서가 지켜졌는가?
- 비주얼 톤이 모든 섹션에 일관되게 적용되었는가?

---
일반 검증 항목:
1. 입력에 없는 수치를 생성했는가?
2. 입력에 없는 맛/공법/인증을 창작했는가?
3. 각 POINT의 키워드가 다른 POINT에 등장하는가?
4. 모든 헤드라인에 카피 프레임 키워드가 들어있는가?
5. GIF가 3개 이하이며 모두 촬영 가능한 물리적 움직임인가?
6. POINT 수가 제품 복잡도에 맞는가?
7. POINT가 물리적·감각적·기능적 특성인가?
8. 카피 프레임이 금지 프레임을 사용하지 않았는가?
9. 약점 수치를 강점처럼 포장하지 않았는가?
10. 다중 타겟 공감 섹션이 타겟별로 분배되었는가?
11. 비주얼 지시문에 제품 실제 외형이 포함되었는가?
12. POINT 간 내용이 중복되지 않는가?
13. 비주얼 지시문에 텍스트 삽입을 지시하지 않았는가?
14. 히어로와 CTA 카피가 다른가?
15. 카피 전략 유형이 1개 이상 적용되었는가?
16. FAQ에서 입력에 없는 인증/정책을 날조하지 않았는가?
[/VALIDATION]

★★★ 작성 절차 ★★★
1단계: STEP 0~5 분석 작성
2단계: 기획서 초안 작성 ("진짜", "완벽한" 등 금지 단어 절대 사용 금지)
3단계: VALIDATION 전수 검사 수행
4단계: 위반 1건이라도 있으면 수정한 최종본을 [FINAL] 태그로 재출력

★ "진짜"는 한국어에서 무의식적으로 쓰기 쉬운 단어입니다.
  "진짜"를 쓰려 할 때마다 "본연의", "제대로 된", "확실한"으로 바꾸세요.
  서브카피, 대안, 브릿지에서 특히 주의하세요.
★ FAQ 답변에서 제품 정보에 없는 인증, 환불 정책, 검사 결과를 절대 만들지 마세요.
★ "215kcal"도 헤드라인 대안에서 긍정적 맥락으로 사용하지 마세요.`;
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
    const typeMatch = content.match(/섹션유형:\s*(.+)/);
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
    const rawType = typeMatch ? typeMatch[1].trim().toLowerCase() : '';
    // 섹션유형 문자열을 SectionType으로 매핑
    const typeMap: Record<string, string> = {
      hero: 'hero',
      empathy: 'empathy',
      'impact-typo': 'impact-typo',
      'impact_typo': 'impact-typo',
      point: 'point',
      comparison: 'comparison',
      trust: 'trust',
      divider: 'divider',
      lifestyle: 'lifestyle',
      situation: 'situation',
      recipe: 'recipe',
      'how-to': 'recipe',
      sizzle: 'sizzle',
      review: 'review',
      faq: 'faq',
      cta: 'cta',
      spec: 'spec',
      bundle: 'bundle',
      flavor: 'flavor',
      closeup: 'closeup',
      lineup: 'lineup',
      'product-cut': 'product-cut',
      'product_cut': 'product-cut',
    };

    const section: Section = {
      number,
      name: nameMatch ? nameMatch[1].trim() : `섹션 ${number}`,
      sectionType: (typeMap[rawType] || rawType || undefined) as Section['sectionType'],
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

  // 중복 섹션 번호 제거 (같은 번호가 있으면 첫 번째만 유지)
  const seen = new Set<number>();
  const deduplicated = sections.filter((s) => {
    if (seen.has(s.number)) return false;
    seen.add(s.number);
    return true;
  });

  // ── 섹션유형 유효성 검증: 유효하지 않은 sectionType → undefined ──
  const VALID_SECTION_TYPES: Set<string> = new Set<string>([
    'hero', 'empathy', 'impact-typo', 'point', 'comparison',
    'trust', 'divider', 'lifestyle', 'situation', 'recipe',
    'review', 'faq', 'sizzle', 'cta', 'spec', 'bundle',
    'flavor', 'closeup', 'lineup', 'product-cut',
  ]);

  for (const s of deduplicated) {
    if (s.sectionType && !VALID_SECTION_TYPES.has(s.sectionType)) {
      s.sectionType = undefined;
    }
  }

  // ── 중복 섹션유형 구분: 같은 sectionType이 여러 개면 suffix 추가 ──
  const typeCount = new Map<string, number>();
  for (const s of deduplicated) {
    if (s.sectionType) {
      typeCount.set(s.sectionType, (typeCount.get(s.sectionType) ?? 0) + 1);
    }
  }

  const typeIndex = new Map<string, number>();
  for (const s of deduplicated) {
    if (s.sectionType && (typeCount.get(s.sectionType) ?? 0) > 1) {
      const idx = (typeIndex.get(s.sectionType) ?? 0) + 1;
      typeIndex.set(s.sectionType, idx);
      s.name = `${s.name} (${s.sectionType}-${idx})`;
    }
  }

  // Fallback if parsing fails entirely
  if (deduplicated.length === 0) {
    sections.push({
      number: 1,
      name: '히어로',
      sectionType: 'hero',
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

  return deduplicated;
}

// ===== Claude API 호출 (기획서 생성) =====
interface CallClaudeConfig {
  useBackend: boolean;
  backendUrl: string;
  claudeApiKey: string;
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  timeout: number,
  maxRetries = 2,
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeout);
      if (response.status === 429 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 3000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 3000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
    }
  }
  throw lastError || new Error('API 요청 실패');
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
    model: 'claude-opus-4-6',
    max_tokens: 32000,
    thinking: {
      type: 'enabled',
      budget_tokens: 16000,
    },
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  };

  const response = await fetchWithRetry(
    url,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    },
    300000  // 5분 (extended thinking 대응)
  );

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as {
      error?: { message?: string } | string;
    };
    if (response.status === 401 || response.status === 403)
      throw new Error('API 키가 유효하지 않습니다.');
    if (response.status === 429)
      throw new Error('API 사용량 한도 초과. 잠시 후 다시 시도해주세요.');
    if (response.status === 504)
      throw new Error('서버 타임아웃. 잠시 후 다시 시도해주세요.');
    const errorMessage =
      typeof errorData.error === 'object'
        ? errorData.error?.message
        : errorData.error;
    const msg = errorMessage || '알 수 없는 오류';
    if (msg.includes('usage limits') || msg.includes('rate limit'))
      throw new Error('API 사용량 한도에 도달했습니다. 한도가 리셋된 후 다시 시도해주세요.');
    throw new Error(msg);
  }

  // 백엔드가 SSE 스트림을 반환하므로 파싱하여 텍스트 추출
  if (useBackend) {
    if (!response.body) throw new Error('응답 스트림을 읽을 수 없습니다.');
    const reader = response.body.getReader();
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
    content: Array<{ type: string; text?: string; thinking?: string }>;
  };
  // extended thinking 응답: thinking 블록 제외, text 블록만 추출
  const textBlocks = data.content.filter((block) => block.type === 'text' && block.text);
  return textBlocks.map((block) => block.text!).join('\n');
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

★ 핵심 임무: 패키지 색상과 원물(내용물) 색상을 정확하게 구분하여 추출하세요.
  - 패키지 색상: 포장재 자체의 색상 (봉지, 박스, 병 등의 색)
  - 원물/내용물 색상: 제품 실물의 색상 (과자, 음료 액체, 화장품 내용물 등)
  - 음료의 경우: 투명 컵/병을 통해 보이는 액체 색상도 반드시 추출

## 분석 항목 (JSON 형식으로 답변)

{
    "productAppearance": "제품 실물(원물)의 외형, 색상, 형태, 크기감 정확 묘사",
    "packageDesign": "패키지 디자인 스타일, 색상 톤, 고급감/캐주얼함 정도",
    "textFromImage": "이미지에서 읽을 수 있는 텍스트 (제품명, 성분, 특징 문구 등)",
    "productCategory": "추정되는 상세 카테고리 (예: 감자스낵, 초콜릿, 젤리 등)",
    "keyFeatures": ["이미지에서 파악되는 제품 특징 3~5가지"],
    "moodAndTone": "제품/패키지에서 느껴지는 분위기 (프리미엄/캐주얼/건강/재미 등)",
    "targetAudienceGuess": "이미지 기반 추정 타겟층",
    "colorPalette": ["주요 색상 3~4개 (패키지+원물 통합)"],
    "uniqueSellingPoints": ["시각적으로 강조된 USP 2~3가지"],
    "packageType": "bag | box | box+bag | bottle | can | tube | pouch | other 중 택1",
    "packageColors": ["패키지 자체의 색상만 정확히 (예: 흰색 봉지, 연두색 텍스트, 베이지 배경)"],
    "productColors": ["원물/내용물의 색상만 정확히 (예: 연한 베이지색 과자, 황금빛 갈색 액체)"]
}

★ packageColors와 productColors는 실제 이미지에서 보이는 색상만 작성하세요. 추측하거나 일반적인 색상을 넣지 마세요.
★ 음료 제품에서 투명 용기를 통해 액체 색상이 보이면, productColors에 정확한 액체 색상을 기록하세요.

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
    : `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiApiKey}`;

  const reqBody: Record<string, unknown> = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1500,
    },
  };

  if (useBackend) reqBody.model = 'gemini-3-flash-preview';

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
