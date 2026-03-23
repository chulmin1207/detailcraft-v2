// ===== IMAGE SERVICE =====
// 이미지 압축, 프롬프트 빌드, Gemini 이미지 생성 통합 모듈

import { fetchWithTimeout } from '@/shared/api/instance';
import type {
  Section,
  SectionType,
  UploadedImages,
  AspectRatio,
  Category,
  RefStrength,
  GenerateImageParams,
  DesignBrief,
  VisualMode,
  ImageAnalysis,
  SectionDesignDirective,
  SectionReferenceFolder,
} from '@/shared/types';

// ===== Base64 안전 추출 헬퍼 =====

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
      const response = await fetchWithTimeout(url, options, timeout);
      if (response.status === 429 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 2000; // 2s, 4s
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 2000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
    }
  }
  throw lastError || new Error('API 요청 실패');
}

// ===== 이미지 압축/처리 함수들 =====

// 이미지 압축 함수 (API 전송 전 크기 축소)
export function compressImage(
  base64: string,
  maxWidth: number = 1200,
  quality: number = 0.7
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // 최대 너비를 초과하면 비율에 맞게 축소
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

      // JPEG로 압축하여 용량 감소
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64); // 실패 시 원본 반환
    img.src = base64;
  });
}

// API 전송용 이미지 압축 (더 작은 크기)
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

// 이미지 리사이즈 함수
export function resizeImage(
  base64: string,
  targetWidth: number
): Promise<string> {
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

// Base64를 Blob으로 변환
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

// 동적으로 aspectRatio 포함한 config 반환
export function getModelConfigWithRatio(
  baseConfig: Record<string, unknown>,
  selectedAspectRatio: AspectRatio
): Record<string, unknown> {
  const config = { ...baseConfig };
  if (config.imageConfig) {
    config.imageConfig = {
      ...(config.imageConfig as Record<string, unknown>),
      aspectRatio: selectedAspectRatio,
    };
  } else {
    config.imageConfig = { aspectRatio: selectedAspectRatio };
  }
  return config;
}

// ===== 프롬프트 빌더 =====

interface BuildImagePromptOptions {
  productName?: string;
  category?: Category | string;
  productFeatures?: string;
  additionalNotes?: string;
  uploadedImages?: UploadedImages;
  sectionReferences?: Record<number, string[]>;
  refStrength?: RefStrength;
  generatedSections?: Section[];
  selectedAspectRatio?: AspectRatio;
  headline?: string;
  subCopy?: string;
  userVisualPrompt?: string;
  targetAudience?: string;
  designBrief?: DesignBrief | null;
  imageAnalysis?: ImageAnalysis | null;
  sectionDirectives?: Record<string, SectionDesignDirective> | null;
  sectionRefFolders?: Record<string, SectionReferenceFolder> | null;
}

// 섹션 디자인 디렉티브 프롬프트 블록 생성
function buildDirectiveBlock(
  sectionType: SectionType | undefined,
  sectionDirectives?: Record<string, SectionDesignDirective> | null
): string {
  if (!sectionDirectives || !sectionType) return '';
  const directive = sectionDirectives[sectionType];
  if (!directive) return '';

  return `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
★★★ 디자인 가이드 (${directive.sourceRefCount}장 레퍼런스 분석 기반) ★★★
레퍼런스의 디자인 구조를 따르되, 내용만 현재 제품으로 교체하세요.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[레이아웃 — 따르세요] ${directive.layoutPatterns}

[타이포그래피 — 따르세요] ${directive.typographyStyle}

[컬러 무드] ${directive.colorMood}
→ 톤/분위기는 참고. 실제 색상은 제품 패키지에서 추출.

[컴포지션 — 따르세요] ${directive.compositionRules}

[그래픽 요소 — 따르세요] ${directive.graphicElements}

★ 레퍼런스의 디자인 뼈대(레이아웃, 타이포, 구도)를 유지하고 제품/텍스트/색상만 교체하세요.`;
}

// imageAnalysis에서 제품 외형 + 색상 제약 블록 생성
function buildColorConstraint(imageAnalysis?: ImageAnalysis | null): string {
  if (!imageAnalysis) return '';

  const parts: string[] = [];

  // 제품 외형 묘사 (제품명과 실제 모습의 괴리 방지)
  const appearance = imageAnalysis.productAppearance;
  const packageDesign = imageAnalysis.packageDesign;
  const detailedCategory = imageAnalysis.productCategory;

  if (appearance || packageDesign || detailedCategory) {
    parts.push('\n=== ⚠️ 제품 실물 외형 (최우선 — 이미지 분석 기반) ===');
    if (detailedCategory) {
      parts.push(`실제 제품 유형: ${detailedCategory}`);
    }
    if (appearance) {
      parts.push(`제품 실물 외형: ${appearance}`);
    }
    if (packageDesign) {
      parts.push(`패키지 디자인: ${packageDesign}`);
    }
    parts.push('★ 제품명에 원재료 이름이 포함되어 있더라도(예: 두부과자, 초코파이, 고구마칩), 원재료 자체가 아닌 위에 묘사된 "완성된 제품"을 그려야 합니다.');
    parts.push('★ 원재료(두부, 초콜릿 덩어리, 생고구마 등)만 단독으로 그리지 마세요. 반드시 완성된 제품(과자, 스낵, 가공식품)의 모습을 그리세요.');
  }

  const pkgColors = imageAnalysis.packageColors || [];
  const prodColors = imageAnalysis.productColors || [];
  const pkgType = imageAnalysis.packageType;

  if (pkgColors.length > 0 || prodColors.length > 0 || pkgType) {
    parts.push('\n=== ⚠️ 제품 색상 제약 (최우선 — 절대 변경 금지) ===');
    if (pkgType) {
      parts.push(`패키지 유형: ${pkgType}`);
    }
    if (pkgColors.length > 0) {
      parts.push(`패키지 실제 색상: ${pkgColors.join(', ')}`);
      parts.push('→ 패키지를 그릴 때 반드시 위 색상으로 표현. 다른 색상으로 바꾸지 마세요.');
    }
    if (prodColors.length > 0) {
      parts.push(`원물/내용물 실제 색상: ${prodColors.join(', ')}`);
      parts.push('→ 제품 실물을 그릴 때 반드시 위 색상으로 표현.');
    }
    parts.push('★ 배경색은 자유롭지만, 제품/패키지 자체의 색상은 위 정보와 정확히 일치해야 합니다.');
  }

  return parts.length > 0 ? parts.join('\n') : '';
}

// 카테고리별 연출 스타일 가이드
const CATEGORY_STYLING: Record<string, {
  props: string;
  background: string;
  mood: string;
}> = {
  snack: {
    props: '과자 부스러기, 원재료(곡물/견과/과일), 소금 알갱이, 나무 도마, 크래프트지',
    background: '따뜻한 베이지/크림색 톤, 내추럴 텍스처',
    mood: '맛있는, 바삭한, 먹음직스러운, 간식 타임의 즐거움',
  },
  beverage: {
    props: '얼음 조각, 물방울, 과일 슬라이스, 허브 잎, 유리컵, 이슬 맺힌 표면',
    background: '시원한 느낌의 연한 블루/민트 또는 깨끗한 화이트 톤',
    mood: '청량한, 시원한, 상쾌한, 갈증 해소',
  },
  instant: {
    props: '김이 모락모락, 젓가락, 그릇, 양념/소스, 야채 토핑, 주방 소품',
    background: '따뜻한 아이보리/우드톤, 가정적인 느낌',
    mood: '든든한, 따뜻한, 간편한, 집밥 같은',
  },
  health: {
    props: '캡슐/알약 클로즈업, 원료 식물/열매, 연구실 플라스크, 자연 배경',
    background: '깨끗한 화이트/연한 그린/아이보리 톤',
    mood: '신뢰감, 깨끗한, 건강한, 과학적인',
  },
  beauty: {
    props: '텍스처 발림, 꽃잎, 원료 식물, 유리 질감, 물방울, 실크 천',
    background: '소프트 핑크/라벤더/크림색 그라데이션',
    mood: '고급스러운, 촉촉한, 우아한, 피부결이 살아나는',
  },
  living: {
    props: '인테리어 소품, 식물, 깔끔한 선반, 미니멀 오브제',
    background: '모던한 화이트/라이트그레이/우드톤',
    mood: '깔끔한, 실용적인, 모던한, 정돈된',
  },
  other: {
    props: '제품과 어울리는 관련 소품',
    background: '제품 패키지 색상에서 추출한 톤',
    mood: '전문적인, 신뢰감 있는, 고급스러운',
  },
};

// 섹션 유형별 전문 레이아웃 가이드
interface SectionLayout {
  role: string;
  layout: string;
  typography: string;
  graphicElements: string;
  productPlacement: string;
}

const SECTION_TYPE_LAYOUTS: Record<string, SectionLayout> = {
  hero: {
    role: '히어로 배너 — 첫인상, 브랜드 아이덴티티 확립',
    layout: `색상 배경 위에 제품과 타이포가 하나의 그래픽으로 통합된 구성.
상단 영역: 대형 디자인 타이포그래피 (제품명/핵심 카피가 그래픽 요소로 디자인됨)
하단 영역: 제품 패키지 + 원재료/소품이 역동적으로 배치
배경색은 패키지 디자인에서 추출한 톤`,
    typography: `헤드라인은 단순한 글자가 아닌 "디자인된 타이포그래피"로 표현:
- 글자 자체가 그래픽 요소 — 그림자, 아웃라인, 색상 대비, 두께 변화 적용
- 핵심 단어는 더 크고 굵게, 보조 단어는 얇고 작게 — 시각적 리듬감
- 서브카피는 헤드라인보다 확연히 작고 가벼운 톤
- 뱃지/라벨은 원형 또는 라운드 사각형 안에 짧은 텍스트`,
    graphicElements: `원형/라운드 뱃지 2~3개 (핵심 스펙 강조)
제품 뒤편 은은한 그라데이션 또는 방사형 빛`,
    productPlacement: '제품 패키지 전면 노출, 크고 선명하게',
  },
  empathy: {
    role: '공감 — 타겟 고객의 고민에 공감하는 텍스트+그래픽 중심 구성',
    layout: `★★★ 인물 얼굴 금지. 텍스트+그래픽 중심 구성. 제품/패키지 등장 금지. 공감 텍스트만으로 구성. ★★★
상단: 색상 배경 영역에 디자인된 대형 공감 질문 타이포
하단: 추가 공감 카피 또는 감성적 그래픽 요소 (일러스트, 아이콘, 패턴 등)
★ 사람 얼굴, 제품, 패키지 모두 등장 금지 — 순수 타이포+그래픽으로만 구성
★ 하단에 별도 제품 누끼/알갱이 컷 추가 금지
텍스트 영역과 그래픽 영역이 명확히 분리되되, 하나의 긴 이미지로 이어지는 구성`,
    typography: `공감 질문형 카피를 감성적인 디자인 타이포로 표현:
- 따옴표("")를 활용한 인용문 스타일 디자인
- 핵심 감정 단어를 강조색으로 처리
- 서브카피는 가벼운 톤으로 배치`,
    graphicElements: `대각선 또는 곡선으로 텍스트 영역과 그래픽 영역을 분할
말풍선 UI로 고객 고민/해결 표현
뱃지/스티커 요소, 감성 일러스트`,
    productPlacement: '★★★ 제품/패키지 등장 금지. 공감 텍스트만으로 구성.',
  },
  point: {
    role: '핵심 포인트 — 구조화된 셀링 포인트 (POINT.01, 02...)',
    layout: `상단 텍스트 영역: 색상 배경 + 디자인된 타이포 (POINT 넘버 + 헤드라인)
하단 이미지 영역: 제품 클로즈업, 원재료 사진, 또는 비교 시각화
두 영역이 하나의 긴 세로 이미지로 이어지는 구성`,
    typography: `"POINT.01" 라벨: 작은 영문, 구분선(|) 포함, 라벨 디자인
핵심 수치를 초대형 디자인 타이포로 강조 (예: "7g"을 매우 크고 굵게)
- 수치 글자 자체에 그라데이션, 색상, 3D 효과 등 그래픽 처리
헤드라인은 감각적이고 시선을 끄는 디자인 타이포`,
    graphicElements: `포인트 넘버링 라벨 디자인
비교 인포그래픽 (사진 기반 비교 — 실제 식재료 사진 활용)
원형 아이콘 + 일러스트`,
    productPlacement: '제품 원물/클로즈업 중심. ★ 패키지 이미지는 넣지 마세요 — hero/다른 섹션에서 이미 보여줬으므로 반복 시 피로도 상승. 원재료, 단면, 비교 소품으로 구성.',
  },
  lifestyle: {
    role: '라이프스타일 — 실제 사용 장면으로 구매 후 모습 시각화',
    layout: `상단 텍스트 영역: 색상 배경에 디자인된 헤드라인 타이포 + 서브카피
하단 사진 영역: 감성적인 라이프스타일 사진 (실제 사용 장면)
★ 사진은 감성적이고 무드 있는 연출 — 단순히 제품을 놓은 사진이 아님
★★★ 사람 얼굴 절대 금지. 손과 팔까지만 등장 가능. ★★★
★ 뒷배경 보케(아웃포커스) 효과 필수, 따뜻한 자연광 색감 필수
★ 손/팔이 제품을 들고 한 입 먹으려는 순간 또는 여유롭게 즐기는 모습
★ 인물이 없다면 감성적인 소품/공간 연출 (커피잔, 책, 창가 햇살 등과 함께)
전체가 하나의 긴 세로 이미지로 구성`,
    typography: `헤드라인: 감성적인 디자인 타이포 (감탄사, 일상적 톤)
사진 위 캡션: 작고 가벼운 텍스트
체크리스트나 시나리오 텍스트도 디자인 요소로 처리`,
    graphicElements: `사용 상황 미니 일러스트
텍스트 영역과 사진 영역의 자연스러운 전환
구분선 또는 배경 패턴`,
    productPlacement: '라이프스타일 사진 안에 제품이 자연스럽게 등장 — 손/팔만 등장 가능, 얼굴 금지. 보케 효과 필수.',
  },
  sizzle: {
    role: '씨즐컷 — 제품의 식감/풍미/질감을 극대화하는 감각적 클로즈업',
    layout: `제품의 맛있는 순간을 포착한 매크로/클로즈업 중심 구성.
★ 배경은 반드시 밝은 베이지/크림 톤 사용 — 어두운 배경 금지
★ 상단에 짧은 감각적 카피 (3~8자), 하단에 서브카피
★ 중앙에 제품의 가장 맛있어 보이는 순간을 크게 배치
★ 초콜릿이 녹거나 흐르는, 치즈가 늘어나는, 과즙이 터지는 등 "동적인 맛 순간"
★ "먹고 싶다!"는 느낌이 드는 비주얼 — 꾸덕/무거운 느낌이 아닌, 윤기+광택+신선함
★ 조명은 밝고 따뜻하게, 하이라이트가 살아있는 푸드 포토그래피 스타일
★ 한국 이커머스 상세페이지의 한 섹션 느낌 — 스크롤 중 식욕을 자극하는 비주얼`,
    typography: `감각적 키워드를 중형 디자인 타이포로:
- "달콤한 코팅", "녹진한 초코", "촉촉한 한 입" 등 감각 묘사
- 타이포는 이미지 위에 자연스럽게 오버레이
- 서브카피는 매우 작고 가벼운 톤`,
    graphicElements: `제품 클로즈업이 주인공 — 그래픽 최소화
소스/시럽이 위에서 흐르는 동적 연출 (얇고 윤기 나게)
단면 컷어웨이 (내부 구조 노출) — 1~2개만, 과하지 않게
★ 밝은 조명 + 하이라이트 반사로 윤기/광택/신선함 강조
★ 너무 많은 제품을 쌓지 마세요 — 2~4개만 여유있게 배치
배경은 따뜻한 톤의 단순 배경 — 보케 처리로 깊이감`,
    productPlacement: '제품 실물 2~4개를 여유있게 배치 — 코팅 윤기, 단면 1개, 밝은 조명으로 먹음직스럽게',
  },
  situation: {
    role: '상황 연출 — 특정 TPO(시간/장소/상황)에서의 제품 활용',
    layout: `전체 화면 라이프스타일 사진 위에 디자인된 캡션 타이포.
★ 다중 컷(2컷, 4컷 등) 구성 시 각 컷 사이에 충분한 여백(간격) 포함
★ 각 컷은 둥근 모서리(border-radius)로 카드 느낌
★ 컷이 다닥다닥 붙지 않도록 — 최소 8~12px 간격 시각적으로 확보
★ 그리드 레이아웃 사용 시 각 칸 사이에 반드시 흰색 구분선(약 8px)을 넣어 명확히 분리하세요.
사진이 80% 이상 차지, 텍스트는 사진 위에 자연스럽게 오버레이
상황의 분위기가 사진 전체에서 느껴지도록`,
    typography: `상황 설명 캡션: 가벼운 디자인 타이포 (사진 위 오버레이)
핵심 상황 키워드: 약간 크고 강조색으로
서브카피: 매우 작고 가벼운 톤`,
    graphicElements: `사진 위 반투명 오버레이 (가독성 확보)
미니 아이콘 (시간/장소/상황 표시)
프레임 또는 모서리 장식`,
    productPlacement: '사진 속에 제품이 자연스럽게 등장 (소품처럼 배치)',
  },
  review: {
    role: '리뷰 — 실제 구매자 후기로 사회적 증거',
    layout: '리뷰 카드 5개 세로 배치. 각 리뷰에 빨간색 별 5개. 플랫폼 이름 금지.',
    typography: '구어체 리뷰 텍스트. 리뷰어 이름은 김*미 형태.',
    graphicElements: '빨간색 별점, 카드 UI, 따뜻한 크림~베이지 배경',
    productPlacement: '패키지 이미지 금지',
  },
  faq: {
    role: 'FAQ — 구매 전 궁금증 해소, 가격 앵커링',
    layout: `상단: 디자인된 FAQ 헤드라인 타이포
중앙: Q&A 카드 3~5개 (아코디언 또는 카드 형태)
하단: 제품 사진 또는 추가 정보`,
    typography: `Q: 질문은 굵은 톤, A: 답변은 가벼운 톤
핵심 답변 키워드를 강조색으로 처리
⚠️ 답변에서 입력에 없는 정보를 날조하지 마세요`,
    graphicElements: `Q&A 카드 디자인 (라운드 사각형)
번호 또는 물음표 아이콘
구분선으로 각 Q&A 분리`,
    productPlacement: '하단 또는 배경으로 제품 작게 배치',
  },
  cta: {
    role: '마무리 CTA — 브랜드 정리, 구매 유도',
    layout: `배경: 제품 사진 또는 감성적인 분위기의 사진
그 위에 디자인된 대형 타이포로 마무리 카피
제품 패키지가 중앙에 프리미엄하게 배치
CTA 버튼 스타일의 그래픽 요소`,
    typography: `감성적인 마무리 카피를 디자인 타이포로:
- 헤드라인이 이미지의 핵심 그래픽 요소가 됨
- 사진 위에 자연스럽게 녹아드는 타이포 배치
- 서브카피는 가볍고 작은 톤
- CTA 텍스트는 버튼/뱃지 안에 배치`,
    graphicElements: `해시태그 스타일 뱃지
CTA 버튼 그래픽 (라운드 사각형)
은은한 그라데이션 배경
제품 아래 그림자로 고급감`,
    productPlacement: '제품 패키지 중앙 배치, 뷰티샷 스타일',
  },
  trust: {
    role: '신뢰/인증 — HACCP, 수상, 인증서, 임상 데이터로 신뢰 구축',
    layout: `깔끔한 배경 위에 인증 마크/인증서 이미지 배치
상단에 "안심하고 드세요" 류의 신뢰 카피
인증 마크를 그리드/나열형으로 정리
공장/시설 사진이 있으면 하단에 배치`,
    typography: `신뢰감 있는 고딕 타이포:
- 헤드라인은 안정감 있는 중간 크기
- 인증 명칭은 볼드 처리
- 부가 설명은 작은 크기로 보조`,
    graphicElements: `인증 마크 뱃지 (HACCP, ISO, 유기농 등)
인증서 실물 이미지
체크마크/방패 아이콘
깔끔한 구분선`,
    productPlacement: '제품 옆에 인증 마크 배치 또는 제품 없이 인증 중심',
  },
  divider: {
    role: '섹션 전환 브릿지 — 시각적 환기, 스크롤 피로 방지',
    layout: `★ 반드시 가로로 넓고 세로로 얇은 비율 (약 3:1 또는 4:1)
★ 단순히 제품을 나열하지 말고, 다이나믹하고 풍미감 있는 연출 필요
★ 제품 이미지는 1번만 배치. 절대 반복하지 마세요. 밝은 베이지/크림 배경 사용.
제품 누끼를 클로즈업으로 크게 보여주며, 소스/시럽이 흐르거나 부서지는 동적 연출
또는 제품 원재료(초콜릿, 과일, 곡물 등)와 함께 역동적으로 배치
텍스트 없음 — 순수 비주얼만
제품의 맛있는 느낌이 전해지는 비주얼`,
    typography: `텍스트 없음`,
    graphicElements: `클로즈업된 제품 누끼 + 동적 연출 (부서짐, 소스 흐름, 파편 등)
제품 원재료/소품과 함께 역동적 배치
그림자로 입체감
세로로 짧고 가로로 넓은 띠 형태
★ 흰 배경에 작은 제품만 놓는 심심한 구성 금지`,
    productPlacement: '제품 누끼를 클로즈업으로 크게 — 동적 연출(부서짐, 녹음, 흐름)과 함께',
  },
  recipe: {
    role: '사용법/레시피 — 조리법, 섭취법, 활용 방법 안내',
    layout: `상단에 "이렇게 즐겨보세요!" 류의 안내 카피
Step 1/2/3 또는 01/02/03 넘버링으로 단계별 안내
각 단계별 사진 + 설명 카드형 레이아웃
완성된 결과물 사진을 크게 배치`,
    typography: `친근하고 실용적인 톤:
- 넘버링은 크고 볼드하게
- 단계 설명은 간결하게
- "Tip!" 같은 보조 정보는 작게`,
    graphicElements: `넘버링 배지 (01, 02, 03)
화살표/플로우 연결선
완성 사진 프레임
아이콘 (타이머, 온도, 비율 등)`,
    productPlacement: '제품이 조리/사용 과정에 자연스럽게 등장',
  },
  spec: {
    role: '제품 상세정보 — 법적 필수 고지사항, 영양정보, 원재료',
    layout: `깔끔한 흰색/밝은 배경
제품 사진 + 영양성분표 나란히 배치
원재료명, 제조원, 소비기한 등 텍스트 나열
표 형태의 정보 정리`,
    typography: `가독성 중심의 작은 고딕:
- 항목명은 볼드
- 내용은 레귤러
- 표 형태로 깔끔하게 정리`,
    graphicElements: `영양성분표 테이블
제품 실물 사진 (패키지)
구분선
법적 필수 마크`,
    productPlacement: '패키지 정면 사진 1장',
  },
};

// 섹션별 기본 비율 (auto 모드에서 레퍼런스 없을 때 fallback)
export const SECTION_DEFAULT_RATIOS: Record<string, AspectRatio> = {
  hero: '9:16',
  empathy: '9:16',
  situation: '9:16',
  sizzle: '9:16',
  point: '9:16',
  lifestyle: '9:16',
  divider: '9:16',
  trust: '9:16',
  review: '9:16',
  bundle: '9:16',
  flavor: '9:16',
  closeup: '9:16',
  lineup: '9:16',
  'product-cut': '9:16',
  cta: '9:16',
  recipe: '9:16',
  faq: '9:16',
  spec: '9:16',
};

/**
 * auto 모드: 매칭된 레퍼런스 비율 + 기획 정보량 기반 최적 비율 결정
 */
export function resolveAutoRatio(
  section: Section,
  sectionRefFolders?: Record<string, SectionReferenceFolder> | null,
): AspectRatio {
  const sType = section.sectionType;

  // 1. 매칭된 레퍼런스의 비율 확인
  if (sType && sectionRefFolders?.[sType]) {
    const folder = sectionRefFolders[sType];
    const matchedIdx = folder.matchedIndices;
    const ratios = folder.imageRatios;

    if (matchedIdx && matchedIdx.length > 0 && ratios && ratios.length > 0) {
      // 매칭된 이미지들의 비율 중 가장 많은 비율 선택
      const matchedRatios = matchedIdx
        .map((idx) => ratios[idx])
        .filter(Boolean);

      if (matchedRatios.length > 0) {
        // 최빈 비율
        const freq: Record<string, number> = {};
        for (const r of matchedRatios) {
          freq[r] = (freq[r] || 0) + 1;
        }
        const bestRatio = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0] as AspectRatio;

        // 정보량 보정: 카피가 길면 더 세로로
        const textLength = (section.headline?.length || 0) + (section.subCopy?.length || 0) + (section.visualPrompt?.length || 0);
        if (textLength > 200 && ['1:1', '4:3', '3:4'].includes(bestRatio)) {
          return '9:16'; // 정보가 많으면 세로로 늘림
        }
        if (textLength < 50 && ['9:16', '1:4'].includes(bestRatio)) {
          return '3:4'; // 정보가 적으면 짧게
        }

        return bestRatio;
      }
    }

    // 매칭은 안 됐지만 분석된 비율이 있으면 전체 평균 사용
    if (ratios && ratios.length > 0) {
      const freq: Record<string, number> = {};
      for (const r of ratios) {
        freq[r] = (freq[r] || 0) + 1;
      }
      return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0] as AspectRatio;
    }
  }

  // 2. fallback: 섹션 타입별 기본 비율
  return (sType && SECTION_DEFAULT_RATIOS[sType]) || '9:16';
}

// 섹션 번호 → 섹션 유형 기본 매핑 (sectionType이 없을 때 fallback)
const SECTION_NUMBER_TO_TYPE: Record<number, SectionType> = {
  1: 'hero',
  2: 'empathy',
  3: 'point',
  4: 'trust',
  5: 'divider',
  6: 'lifestyle',
  7: 'situation',
  8: 'recipe',
  9: 'review',
  10: 'faq',
  11: 'cta',
  12: 'spec',
};

function getSectionLayout(section: Section): SectionLayout {
  // 1. sectionType이 있으면 그것 사용
  if (section.sectionType && SECTION_TYPE_LAYOUTS[section.sectionType]) {
    return SECTION_TYPE_LAYOUTS[section.sectionType];
  }
  // 2. 섹션 번호로 fallback
  const fallbackType = SECTION_NUMBER_TO_TYPE[section.number] || 'hero';
  return SECTION_TYPE_LAYOUTS[fallbackType] || SECTION_TYPE_LAYOUTS['hero'];
}


/**
 * 섹션별 이미지 생성 프롬프트를 빌드하는 핵심 함수
 * 프로페셔널 한국 이커머스 상세페이지 디자인 품질 목표
 */
export function buildImagePrompt(
  section: Section,
  index: number,
  options: BuildImagePromptOptions = {}
): string {
  const {
    productName = '',
    category = '',
    productFeatures = '',
    additionalNotes = '',
    uploadedImages = { product: [], package: [], references: [] },
    sectionReferences = {},
    refStrength = 'strong',
    selectedAspectRatio = '3:4',
    headline: inputHeadline,
    subCopy: inputSubCopy,
    userVisualPrompt: inputVisualPrompt,
    targetAudience = '',
    designBrief = null,
    imageAnalysis = null,
    sectionDirectives = null,
    sectionRefFolders = null,
  } = options;

  const headline = inputHeadline || section.headline || '';
  const subCopy = inputSubCopy || section.subCopy || '';
  const userVisualPrompt = inputVisualPrompt || '';

  const sectionRefs = sectionReferences[index] || [];
  const hasRefs =
    sectionRefs.length > 0 || uploadedImages.references.length > 0;
  const hasProduct = uploadedImages.product.length > 0;
  const hasPackage = uploadedImages.package.length > 0;

  // 비율 결정: auto면 레퍼런스 비율 + 정보량 기반, 수동이면 그대로
  const effectiveAspectRatio: AspectRatio = selectedAspectRatio === 'auto'
    ? resolveAutoRatio(section, sectionRefFolders)
    : selectedAspectRatio;

  // 비율 정보
  const aspectRatioText: Record<string, string> = {
    'auto': 'AUTO - AI determines optimal format',
    '1:1': 'SQUARE format (1:1)',
    '3:4': 'VERTICAL format (3:4) - portrait, taller than wide',
    '4:3': 'HORIZONTAL format (4:3) - landscape, wider than tall',
    '9:16': 'TALL VERTICAL format (9:16) - mobile-optimized',
    '16:9': 'WIDE BANNER format (16:9) - cinematic',
    '3:2': 'LANDSCAPE format (3:2) - classic photo',
    '2:3': 'PORTRAIT format (2:3) - classic portrait',
    '5:4': 'NEAR-SQUARE LANDSCAPE format (5:4)',
    '4:5': 'NEAR-SQUARE PORTRAIT format (4:5) - Instagram',
    '21:9': 'ULTRA-WIDE BANNER format (21:9) - cinematic wide',
    '1:4': 'EXTRA-TALL VERTICAL format (1:4) - long scroll detail page section',
    '4:1': 'ULTRA-WIDE format (4:1) - panoramic banner',
    '1:8': 'EXTREME TALL format (1:8) - full detail page scroll',
    '8:1': 'EXTREME WIDE format (8:1) - ultra panoramic',
  };
  const ratioDesc =
    aspectRatioText[effectiveAspectRatio] || aspectRatioText['1:4'];

  // ===== designBrief가 있으면 새 프롬프트, 없으면 기존 프롬프트 =====
  if (designBrief) {
    return buildImagePromptWithBrief(section, index, {
      designBrief,
      productName,
      productFeatures,
      targetAudience,
      headline,
      subCopy,
      userVisualPrompt,
      additionalNotes,
      ratioDesc,
      selectedAspectRatio: effectiveAspectRatio,
      hasProduct,
      hasPackage,
      imageAnalysis,
      sectionDirectives,
    });
  }

  // ===== 기존 프롬프트 (designBrief 없을 때 fallback) =====
  const catStyle = CATEGORY_STYLING[category] || CATEGORY_STYLING['other'];
  const sectionLayout = getSectionLayout(section);

  let prompt = `You are a professional Korean e-commerce detail page designer.
Create a SINGLE section image that looks like part of a cohesive, professionally designed product detail page (상세페이지).

=== IMAGE FORMAT ===
📐 ${ratioDesc} — MUST generate in exactly ${effectiveAspectRatio} ratio.

=== DESIGN SYSTEM (일관된 디자인 시스템) ===
This image is Section ${section.number} of 8 in a unified detail page.
ALL sections share the same design language:
- Background: ${catStyle.background} — consistent warm/neutral tone throughout
- Mood: ${catStyle.mood}
- Typography: Modern Korean typography, mix of bold gothic + light sans-serif
- Color accent: Extract from product packaging (brand primary color)
- Consistent spacing, margins, and visual rhythm across all sections

=== SECTION ${section.number}: ${sectionLayout.role} ===

**레이아웃 구조:**
${sectionLayout.layout}

**타이포그래피 가이드:**
${sectionLayout.typography}

**그래픽 디자인 요소:**
${sectionLayout.graphicElements}

**제품 배치:**
${sectionLayout.productPlacement}

=== 제품 정보 ===
제품명: ${productName}
제품 특징: ${productFeatures}
타겟 고객: ${targetAudience}
카테고리 연출 소품: ${catStyle.props}
★ 제품명의 원재료 이름(두부, 초코, 고구마 등)은 원재료 자체가 아니라 완성된 제품(과자, 스낵 등)을 가리킵니다. 원재료만 단독으로 그리지 마세요.

=== 텍스트 (디자인된 타이포그래피로 이미지에 포함) ===
헤드라인: ${headline}
서브카피: ${subCopy}

★★★ 타이포그래피 = 그래픽 디자인 요소 ★★★
텍스트는 단순히 글자를 나열하는 것이 아니라, 그래픽 디자인 요소로서 시각적으로 디자인되어야 합니다:
- 헤드라인 글자 자체가 이미지의 핵심 비주얼 — 크고 굵고 시각적 임팩트가 있어야 함
- 핵심 단어는 색상/크기/두께를 다르게 하여 시각적 리듬감 부여
- 글자에 그림자, 아웃라인, 색상 대비, 그라데이션 등 그래픽 효과 자유롭게 활용
- 서브카피는 헤드라인보다 확연히 작고 가벼운 톤
- 섹션 라벨("히어로 배너", "솔루션", "CTA" 등) 절대 표시 금지
- "USP", "제품 상세", "구매 유도" 같은 메타 텍스트 금지

참고: 한국 이커머스 상세페이지의 디자인된 타이포 예시 —
크런틴: 대형 볼드 한글 "크런치!볼" + 색상 대비 + 제품 위에 역동적 배치
랩노쉬: 깔끔한 고딕 헤드라인 + 초대형 숫자 "20g" 강조
한끼통살: 다크 배경 위 화이트 대형 타이포 + 식감 강조 카피

=== 프로페셔널 디자인 핵심 원칙 ===
1. **디자인된 타이포**: 글자가 이미지의 그래픽 요소로 디자인됨 — 단순 텍스트 출력 ✗, 시각적으로 디자인된 타이포 ○
2. **구성 통합**: 텍스트 영역(색상 배경) + 사진 영역이 하나의 긴 이미지로 자연스럽게 이어짐
3. **연출 사진**: 제품 + 원재료/소품을 예술적으로 배치한 스타일드 포토그래피
4. **정보 계층**: 헤드라인(대형 디자인 타이포) > 핵심 수치(초대형 강조) > 서브카피(가벼운 톤) > 뱃지(라운드 배경)
5. **한국 이커머스 스타일**: 쿠팡/네이버 상위 노출 상세페이지 품질 수준 — 판매가 가능한 완성된 디자인`;

  if (hasProduct || hasPackage) {
    prompt += `

=== 제품/패키지 이미지 (최우선 참고) ===
제공된 제품/패키지 이미지에서:
- 제품 외형을 정확하게 재현 (형태, 색상, 로고, 패턴)
- 패키지 색상에서 전체 디자인 컬러 팔레트 추출
- 제품 브랜드 아이덴티티를 디자인에 반영`;
  }

  // 디렉티브 블록이 있으면 더 구체적인 레퍼런스 지시가 포함되므로 일반 안내 생략
  const hasDirective = sectionDirectives && section.sectionType && sectionDirectives[section.sectionType];
  if (hasRefs && !hasDirective) {
    if (refStrength === 'strong') {
      prompt += `

=== 레퍼런스 이미지 (스타일 소스) ===
레퍼런스 이미지에서 추출 적용할 요소:
- 전체 분위기, 레이아웃 구조
- 타이포그래피 스타일 (서체 믹스, 크기 대비)
- 그래픽 요소 스타일 (뱃지, 아이콘, 장식)
- 배경 텍스처와 색감

⚠️ 컬러는 반드시 제품 패키지에서 추출. 레퍼런스는 스타일/무드만 참고.`;
    } else {
      prompt += `

=== 레퍼런스 이미지 (레이아웃 참고만) ===
레이아웃/구도만 참고. 색상/무드는 제품 기반으로.`;
    }
  }

  if (userVisualPrompt.trim()) {
    prompt += `

=== 섹션별 추가 지시 ===
${userVisualPrompt}`;
  }

  if (additionalNotes.trim()) {
    prompt += `

=== 글로벌 스타일 요구사항 (최우선 적용) ===
${additionalNotes}`;
  }

  // 섹션 디자인 디렉티브 주입 (레퍼런스 분석 기반)
  const directiveBlock = buildDirectiveBlock(section.sectionType, sectionDirectives);
  if (directiveBlock) {
    prompt += directiveBlock;
  }

  // 2차 방어: imageAnalysis 색상 제약 주입
  const colorConstraint = buildColorConstraint(imageAnalysis);
  if (colorConstraint) {
    prompt += colorConstraint;
  }

  prompt += `

=== 출력 품질 ===
- 실제 한국 이커머스에서 판매 가능한 수준의 완성된 상세페이지 섹션 디자인
- 색상 배경 텍스트 영역 + 사진 영역이 하나의 긴 세로 이미지로 통합된 구성
- 글자는 디자인된 타이포그래피 — 단순 텍스트 렌더링이 아닌, 그래픽으로서의 타이포
- 단일 섹션 이미지 (콜라주/다중 섹션 금지)
- ⚠️ 가짜 인증마크(HACCP, ISO, 식약처, KC 등) 절대 생성 금지
- ⚠️ 허위 수치(만족도 %, 판매량 등) 임의 생성 금지
- ⚠️ 존재하지 않는 기관/수상 배지 생성 금지

★★★ 절대 금지 규칙 ★★★
- 사람 얼굴 금지 — AI 인물 퀄리티 이슈. 손/팔까지만 허용
- 시스템 라벨/메타데이터 금지 — "섹션 유형: point" 같은 텍스트 노출 방지
- "구매버튼을 눌러주세요" 같은 구걸/요청 멘트 금지
- 확인되지 않은 수치(누적 판매량, 임의 영양성분) 금지
- 한국어 텍스트는 이미지에 직접 렌더링 (후처리 아님)`;

  return prompt;
}

// visualMode별 프롬프트 가이드
function getVisualModeGuide(mode: VisualMode): string {
  switch (mode) {
    case 'product-hero':
      return `⚡ 제품 히어로 모드:
- 제품 패키지 누끼(배경 제거된 이미지)를 크고 선명하게 중앙 또는 하단에 배치
- 제품 주변에 원재료/소품을 역동적으로 연출 (scattered styling)
- 제품이 화면의 주인공 — 시선이 자연스럽게 제품에 집중
- 첨부된 제품/패키지 이미지의 외형을 정확히 재현`;

    case 'product-detail':
      return `🔍 제품 디테일 모드:
- 제품의 원재료, 성분, 질감을 클로즈업으로 보여주는 프로페셔널 포토그래피
- 제품 단면, 내용물, 텍스처를 고화질 매크로 촬영처럼 연출
- 첨부된 제품 이미지의 실제 외형을 정확히 재현하되, 디테일 앵글로 변환
- 소재감, 텍스처, 질감이 생생하게 느껴지는 고퀄리티 사실적 렌더링
- 조명: 소프트 디퓨즈드 라이팅으로 디테일을 살리되 과도한 그림자 방지
- 레퍼런스 이미지의 레이아웃/구도를 적극 참고하여 정보 배치`;

    case 'infographic':
      return `📊 인포그래픽 모드:
- 프로페셔널 정보 시각화 — 한국 이커머스 상위 상세페이지 수준의 인포그래픽
- 아이콘, 차트, 배지, 숫자를 활용한 체계적 정보 전달
- 깔끔한 그래픽 디자인 — 커스텀 일러스트/아이콘/도형으로 고급스럽게
- 비교표, 체크리스트, 진행 바 등 한눈에 이해되는 시각화 구조
- 배경은 깔끔한 단색 또는 은은한 그라데이션
- 레퍼런스 이미지의 정보 배치 구조와 시각적 계층을 적극 반영
- 텍스트와 그래픽 요소의 균형이 중요 — 과도한 텍스트 지양`;

    case 'lifestyle':
      return `🏠 라이프스타일 모드:
- 실제 사용 장면을 프로페셔널하게 연출 — 광고 촬영 수준의 라이프스타일 포토
- TPO(시간/장소/상황)에 맞는 자연스러운 배경 설정
- 첨부된 제품 이미지를 정확히 재현하여 생활 환경에 자연스럽게 배치
- 소품 배치: 테이블, 식기, 음료, 간식 등으로 분위기 연출
- 조명: 자연광 또는 따뜻한 인테리어 조명으로 실제 공간 느낌
- 제품은 자연스럽게 포함하되 라이프스타일 분위기가 주인공
- 레퍼런스 이미지의 구도와 분위기를 적극 반영`;

    case 'emotional':
      return `💫 감성 모드:
- 브랜드 감성을 전달하는 고퀄리티 무드 비주얼
- 컬러, 텍스처, 빛, 자연 요소를 활용한 감성적 분위기 연출
- 타이포그래피가 핵심 — 헤드라인을 감성적이고 임팩트 있게 디자인
- 텍스트 자체가 그래픽 디자인 요소로서 시각적 중심이 되어야 함
- 배경과 텍스트의 대비를 통해 메시지 전달력 극대화
- 레퍼런스 이미지의 감성적 톤, 여백 활용, 타이포 스타일을 적극 반영
- 스크롤 중 시각적 쉼표 역할 — 정보 밀도는 낮추되, 디자인 완성도는 높게`;

    case 'social-proof':
      return `⭐ 소셜프루프 모드:
- 첨부된 제품/패키지 이미지의 실제 외형을 정확히 반영
- 고객 후기, 별점, 신뢰 아이콘을 활용한 프로페셔널한 신뢰 구축 레이아웃
- 말풍선, 카드 UI, 별점 바 등 현대적인 리뷰 시각화
- 깔끔하고 공신력 있는 레이아웃 — 레퍼런스 이미지의 구조를 적극 참고
- ⚠️ 실제 인증마크(HACCP, ISO, 식약처 등)를 절대 생성하지 마세요
- ⚠️ 구체적인 수치(만족도 98%, 판매량 12만 등)를 임의로 만들지 마세요
- ⚠️ 실존 기관 로고, 수상 배지, 인증서를 만들어내지 마세요`;

    default:
      return '';
  }
}

/**
 * DesignBrief 기반 프롬프트 빌드 (새 파이프라인)
 * - 구매 심리, 섹션별 전략, 디자인 가이드를 활용
 */
function buildImagePromptWithBrief(
  section: Section,
  index: number,
  opts: {
    designBrief: DesignBrief;
    productName: string;
    productFeatures: string;
    targetAudience: string;
    headline: string;
    subCopy: string;
    userVisualPrompt: string;
    additionalNotes: string;
    ratioDesc: string;
    selectedAspectRatio: string;
    hasProduct: boolean;
    hasPackage: boolean;
    imageAnalysis?: ImageAnalysis | null;
    sectionDirectives?: Record<string, SectionDesignDirective> | null;
  }
): string {
  const {
    designBrief, productName, productFeatures, targetAudience,
    headline, subCopy, userVisualPrompt, additionalNotes,
    ratioDesc, selectedAspectRatio, hasProduct, hasPackage,
    imageAnalysis = null,
    sectionDirectives = null,
  } = opts;

  // 현재 섹션의 전략 찾기
  const strategy = designBrief.sectionStrategies.find(
    (s) => s.sectionNumber === section.number
  ) || designBrief.sectionStrategies[index];

  const guide = designBrief.designGuide;
  const purchase = designBrief.purchaseAnalysis;

  let prompt = `한국 쇼핑몰 상세페이지 섹션 이미지를 생성하세요.

━━ 이미지 포맷 ━━
📐 ${ratioDesc} — 반드시 ${selectedAspectRatio} 비율로 생성.

━━ 구매 심리 컨텍스트 ━━
- 구매 동기: ${purchase.buyingMotivation}
- 결정적 메시지: ${purchase.decisiveMessage}
- 차별점: ${purchase.competitiveDiff}`;

  if (guide) {
    prompt += `

━━ 디자인 가이드 (레퍼런스 기반) ━━
- 컬러 운용: ${guide.colorUsage}
- 타이포 & 카피: ${guide.typographyAndCopy}
- 레이아웃 & 배치: ${guide.layoutAndPlacement}
- 제품 연출: ${guide.productPresentation}
- 배경 & 장식: ${guide.backgroundAndDecoration}
- 정보 시각화: ${guide.informationVisualization}`;
  }

  if (strategy) {
    const visualModeGuide = getVisualModeGuide(strategy.visualMode);

    prompt += `

━━ 이 섹션 (${section.number}/8) ━━
[설득 역할] ${strategy.persuasionRole}
[시각적 방법] ${strategy.visualMethod}
[정보 시각화] ${strategy.informationVisualization}
[시각 모드] ${strategy.visualMode}
[배경 톤] ${strategy.visualVariation.backgroundTone}
[레이아웃] ${strategy.visualVariation.layoutType}
[정보 밀도] ${strategy.visualVariation.informationDensity}
[감정 곡선] ${strategy.visualVariation.emotionCurve}

━━ 시각 모드 지시 (${strategy.visualMode}) ━━
${visualModeGuide}`;
  }

  prompt += `

━━ 제품 정보 ━━
제품명: ${productName}
제품 특징: ${productFeatures}
타겟 고객: ${targetAudience}
★ 제품명의 원재료 이름(두부, 초코, 고구마 등)은 원재료 자체가 아니라 완성된 제품(과자, 스낵 등)을 가리킵니다. 원재료만 단독으로 그리지 마세요.

━━ 텍스트 (디자인된 타이포그래피로 포함) ━━
헤드라인: ${headline}
서브카피: ${subCopy}

★★★ 타이포그래피 = 그래픽 디자인 요소 ★★★
- 헤드라인은 단순 글자 나열이 아닌, 이미지의 핵심 그래픽 요소로 디자인
- 글자에 그림자/아웃라인/색상 대비/그라데이션 등 그래픽 효과 활용
- 핵심 단어는 크기/색상/두께를 차별화하여 시각적 리듬감 부여
- 서브카피는 헤드라인보다 확연히 작고 가벼운 톤
- 섹션 라벨/메타 텍스트 표시 금지`;

  if (hasProduct || hasPackage) {
    prompt += `

━━ 제품/패키지 이미지 (최우선) ━━
첨부된 제품/패키지 이미지에서:
- 제품 외형을 정확하게 재현 (형태, 색상, 로고, 패턴)
- 패키지 색상에서 전체 디자인 컬러 팔레트 추출`;
  }

  if (userVisualPrompt.trim()) {
    prompt += `

━━ ★★★ 비주얼 지시 (최우선 — 이 지시가 시각 모드 가이드보다 우선합니다) ★★★ ━━
${userVisualPrompt}
⚠️ 위 비주얼 지시의 구도, 연출, 분위기를 반드시 따르세요. 시각 모드 가이드와 충돌 시 이 지시를 우선합니다.`;
  }

  if (additionalNotes.trim()) {
    prompt += `

━━ 글로벌 스타일 요구사항 ━━
${additionalNotes}`;
  }

  // 섹션 디자인 디렉티브 주입 (레퍼런스 분석 기반)
  const directiveBlock = buildDirectiveBlock(section.sectionType, sectionDirectives);
  if (directiveBlock) {
    prompt += directiveBlock;
  }

  // 2차 방어: imageAnalysis 색상 제약 주입
  const colorConstraint = buildColorConstraint(imageAnalysis);
  if (colorConstraint) {
    prompt += colorConstraint;
  }

  prompt += `

━━ 필수 규칙 ━━
- 실제 한국 이커머스에서 판매 가능한 수준의 완성된 상세페이지 섹션 디자인
- 색상 배경 텍스트 영역 + 사진 영역이 하나의 긴 세로 이미지로 통합된 구성
- 글자는 디자인된 타이포그래피 — 그래픽 요소로서의 타이포, 단순 텍스트 렌더링 아님
- 핵심 수치/키워드는 초대형 디자인 타이포로 강조 (그라데이션/색상/두께 변화 등)
- 단일 섹션 이미지 (콜라주/다중 섹션 금지)
- ⚠️ 가짜 인증마크 금지: HACCP, ISO, 식약처, KC 등 실제 인증마크/로고를 절대 생성하지 마세요
- ⚠️ 허위 수치 금지: 만족도, 판매량, 수상 내역 등 사실 확인 불가능한 구체적 수치를 임의로 만들지 마세요
- ⚠️ 가짜 기관/수상 배지 금지: 존재하지 않는 기관명이나 수상 배지를 생성하지 마세요

★★★ 절대 금지 규칙 ★★★
- 사람 얼굴 금지 — AI 인물 퀄리티 이슈. 손/팔까지만 허용
- 시스템 라벨/메타데이터 금지 — "섹션 유형: point" 같은 텍스트 노출 방지
- "구매버튼을 눌러주세요" 같은 구걸/요청 멘트 금지
- 확인되지 않은 수치(누적 판매량, 임의 영양성분) 금지
- 한국어 텍스트는 이미지에 직접 렌더링 (후처리 아님)`;

  return prompt;
}

// ===== 통합 이미지 생성 함수 =====

interface GenerateImageResult {
  dataUrl: string;
  prompt: string;
}

/**
 * 4개의 원본 이미지 생성 함수를 통합한 단일 함수
 * (generateSectionImage, generateSectionImageForStep2,
 *  generateSectionImageWithModel, generateSectionImageWithStep3Options)
 */
export async function generateSectionImage(
  params: GenerateImageParams
): Promise<GenerateImageResult> {
  const {
    section,
    index,
    modelConfig,
    uploadedImages,
    sectionReferences,
    step3Options,
    useBackend,
    backendUrl,
    geminiApiKey,
    selectedAspectRatio,
    productName,
    productFeatures,
    additionalNotes,
    refStrength,
    headline,
    subCopy,
    sectionRefFolders,
  } = params;

  let prompt: string;
  const parts: Array<
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }
  > = [];

  if (step3Options) {
    // ===== STEP 3 모드: 커스텀 프롬프트 빌드 =====
    const {
      includeGenerated = false,
      includeStep1Ref = false,
      includeReference = false,
      includePrompt = false,
      step3Refs = [],
      step3Prompt = '',
      generatedImages = {},
    } = step3Options;

    const hl = headline || section.headline || '';
    const sc = subCopy || section.subCopy || '';

    prompt = `Create a high-quality e-commerce product detail page image for Korean market.

=== SECTION INFO ===
Section Name: ${section.name}
Purpose: ${section.purpose || 'Product promotion'}

=== KOREAN TEXT TO INCLUDE ===
Main Headline (Korean): ${hl}
Sub Copy (Korean): ${sc}

CRITICAL: Render Korean text clearly and legibly.`;

    // 기존 생성 이미지 포함 시
    if (includeGenerated && generatedImages[index]?.data) {
      prompt += `

=== EXISTING IMAGE (REFERENCE FOR IMPROVEMENT) ===
The provided existing image is the current result. Improve upon it while maintaining its overall concept and style.
Keep the good aspects and fix any issues mentioned in the user instructions.`;
    }

    // STEP 1 전체 레퍼런스 포함 시
    if (includeStep1Ref && uploadedImages.references.length > 0) {
      if (refStrength === 'strong') {
        prompt += `

=== STEP 1 GLOBAL REFERENCE (STYLE SOURCE) ===
From the ${uploadedImages.references.length} global reference image(s), extract and apply:
- Overall mood and atmosphere
- Typography style and text treatment
- Background style and texture
- Visual composition feeling

⚠️ Colors must come from PRODUCT images, NOT from references.`;
      } else {
        prompt += `

=== STEP 1 GLOBAL REFERENCE (LAYOUT ONLY) ===
Use global reference images ONLY for layout inspiration.`;
      }
    }

    // 추가 레퍼런스 이미지 포함 시 (STEP 3)
    if (includeReference && step3Refs.length > 0) {
      prompt += `

=== ADDITIONAL STYLE REFERENCE (HIGH PRIORITY) ===
Analyze the ${step3Refs.length} additional reference image(s) and CLOSELY MATCH the style, mood, and composition.
This takes priority over global references for this section.`;
    }

    // 추가 프롬프트 포함 시
    if (includePrompt && step3Prompt.trim()) {
      prompt += `

=== USER INSTRUCTIONS (HIGHEST PRIORITY) ===
${step3Prompt}`;
    }

    prompt += `

=== OUTPUT ===
- 4K resolution, professional e-commerce quality
- Clean, polished result for Korean online shopping platforms`;

    // ===== STEP 3 이미지 수집 =====
    parts.push({ text: prompt });

    // 기존 생성 이미지 (체크 시, 압축)
    if (includeGenerated && generatedImages[index]?.data) {
      const compressed = await compressImageForAPI(generatedImages[index].data);
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: safeExtractBase64(compressed),
        },
      });
    }

    // 제품 이미지 (최대 1장, 압축)
    if (uploadedImages.product.length > 0) {
      const compressed = await compressImageForAPI(uploadedImages.product[0]);
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: safeExtractBase64(compressed),
        },
      });
    }

    // 패키지 이미지 (최대 1장, 압축)
    if (uploadedImages.package.length > 0) {
      const compressed = await compressImageForAPI(uploadedImages.package[0]);
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: safeExtractBase64(compressed),
        },
      });
    }

    // STEP 1 전체 레퍼런스 (최대 1장, 압축)
    if (includeStep1Ref && uploadedImages.references.length > 0) {
      const compressed = await compressImageForAPI(
        uploadedImages.references[0]
      );
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: safeExtractBase64(compressed),
        },
      });
    }

    // 추가 레퍼런스 이미지 (최대 1장, 압축)
    if (includeReference && step3Refs.length > 0) {
      const compressed = await compressImageForAPI(step3Refs[0]);
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: safeExtractBase64(compressed),
        },
      });
    }
  } else {
    // ===== STEP 2: 테스트 검증된 심플 구조 (2026-03-23 확정) =====
    // 구조: 시스템 프롬프트 + 제품 이미지 + 라벨 + 레퍼런스 이미지 + 라벨

    const hl = headline || section.headline || '';
    const sc = subCopy || section.subCopy || '';

    // 1) CLI 테스트와 동일한 심플 프롬프트 (2026-03-23 검증 완료)
    prompt = `당신은 한국 이커머스 상세페이지 디자인 전문가입니다.

[절대 규칙]
1. 반드시 한국어 텍스트를 정확하게 렌더링하세요
2. 레퍼런스 이미지의 디자인 톤, 색감, 타이포그래피 스타일을 기반으로 하되, 각 섹션마다 레이아웃을 변주하세요
3. 제품 이미지의 패키지 디자인을 정확하게 반영하세요 — 색상, 형태, 텍스트 왜곡 없이
4. 전체 상세페이지가 하나의 톤으로 자연스럽게 이어지도록 톤 & 무드를 일관되게 유지하세요
5. 사람 얼굴 금지 — 손/팔까지만 허용
6. 가짜 인증마크(HACCP, ISO 등), 허위 수치 생성 금지

[섹션 ${section.number} — ${section.name}]

텍스트 내용:
- 헤드라인: ${hl}
- 서브카피: ${sc}

제품명: ${productName}`;

    if (productFeatures.trim()) {
      prompt += `\n제품 특징: ${productFeatures}`;
    }
    if (additionalNotes.trim()) {
      prompt += `\n추가 요구사항: ${additionalNotes}`;
    }

    parts.push({ text: prompt });

    // 2) 제품 이미지 + 명확한 라벨
    if (uploadedImages.product.length > 0) {
      const compressed = await compressImageForAPI(uploadedImages.product[0]);
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: safeExtractBase64(compressed),
        },
      });
      parts.push({
        text: '위는 제품 이미지입니다. 이 제품의 패키지 디자인(색상, 형태, 로고, 텍스트)을 정확히 반영하세요. 절대로 다른 제품으로 바꾸거나 색상을 변경하지 마세요.',
      });
    }

    // 3) 패키지 이미지 (있으면)
    if (uploadedImages.package.length > 0) {
      const compressed = await compressImageForAPI(uploadedImages.package[0]);
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: safeExtractBase64(compressed),
        },
      });
      parts.push({
        text: '위는 패키지 이미지입니다. 이 패키지의 색상과 디자인을 정확히 반영하세요.',
      });
    }

    // 4) 레퍼런스 이미지 + 명확한 역할 구분
    // 우선순위: 섹션별 레퍼런스 > 폴더 레퍼런스 > 글로벌 레퍼런스
    let refAttached = false;

    // 4-a) 섹션별 폴더 레퍼런스
    if (!refAttached && section.sectionType && sectionRefFolders) {
      const refFolder = sectionRefFolders[section.sectionType];
      if (refFolder && refFolder.images.length > 0) {
        const bestIdx = refFolder.matchedIndices?.[0] ?? 0;
        const bestImage = refFolder.images[bestIdx];
        if (bestImage) {
          const compressed = await compressImageForAPI(bestImage);
          parts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: safeExtractBase64(compressed),
            },
          });
          parts.push({
            text: '위는 레퍼런스 디자인입니다. 이 디자인의 톤, 색감, 스타일을 참고하되, 요청된 섹션에 맞게 레이아웃을 변주하세요. 내용과 제품은 위의 제품 이미지로 교체하세요.',
          });
          refAttached = true;
        }
      }
    }

    // 4-b) 섹션별 레퍼런스 (Step 2에서 개별 지정)
    if (!refAttached) {
      const sectionRefs = sectionReferences[index] || [];
      if (sectionRefs.length > 0) {
        const compressed = await compressImageForAPI(sectionRefs[0]);
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: safeExtractBase64(compressed),
          },
        });
        parts.push({
          text: '위는 레퍼런스 디자인입니다. 이 디자인의 톤, 색감, 스타일을 참고하되, 요청된 섹션에 맞게 레이아웃을 변주하세요.',
        });
        refAttached = true;
      }
    }

    // 4-c) 글로벌 레퍼런스 (Step 1에서 업로드)
    if (!refAttached && uploadedImages.references.length > 0) {
      const compressed = await compressImageForAPI(uploadedImages.references[0]);
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: safeExtractBase64(compressed),
        },
      });
      parts.push({
        text: '위는 레퍼런스 디자인입니다. 이 디자인의 톤, 색감, 스타일을 참고하되, 요청된 섹션에 맞게 레이아웃을 변주하세요.',
      });
    }
  }

  // ===== Gemini API 호출 (공통) =====
  // 비율 결정: auto면 레퍼런스 비율 + 정보량 기반, 수동이면 그대로
  const effectiveRatio: AspectRatio = selectedAspectRatio === 'auto'
    ? resolveAutoRatio(section, sectionRefFolders)
    : selectedAspectRatio;

  const geminiUrl = useBackend
    ? `${backendUrl}/api/gemini`
    : `https://generativelanguage.googleapis.com/v1beta/models/${modelConfig.model}:generateContent?key=${geminiApiKey}`;

  const reqBody: Record<string, unknown> = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      ...getModelConfigWithRatio(modelConfig.config, effectiveRatio),
    },
  };
  if (useBackend) reqBody.model = modelConfig.model;

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
      (error as { error?: { message?: string } }).error?.message ||
        `API 오류 (${response.status})`
    );
  }

  const data = await response.json();

  // 응답에서 이미지 찾기
  const candidates =
    (
      data as {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              inlineData?: { mimeType?: string; data?: string };
            }>;
          };
        }>;
      }
    ).candidates || [];
  for (const candidate of candidates) {
    const respParts = candidate.content?.parts || [];
    for (const part of respParts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        return {
          dataUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
          prompt: step3Options ? prompt : section.visualPrompt,
        };
      }
    }
  }

  throw new Error('이미지가 생성되지 않았습니다.');
}
