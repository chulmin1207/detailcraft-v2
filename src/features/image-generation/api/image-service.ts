// ===== IMAGE SERVICE =====
// 이미지 압축, 프롬프트 빌드, Gemini 이미지 생성 통합 모듈

import { fetchWithTimeout } from '@/shared/api/instance';
import type {
  Section,
  UploadedImages,
  AspectRatio,
  Category,
  RefStrength,
  GenerateImageParams,
  DesignBrief,
  VisualMode,
} from '@/shared/types';

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
  maxWidth: number = 800,
  quality: number = 0.5
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
    img.src = base64;
  });
}

// Base64를 Blob으로 변환
export function base64ToBlob(base64: string): Blob {
  const parts = base64.split(',');
  const mime = parts[0].match(/:(.*?);/)![1];
  const bstr = atob(parts[1]);
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

// 섹션별 전문 레이아웃 가이드
const SECTION_LAYOUTS: Record<number, {
  role: string;
  layout: string;
  typography: string;
  graphicElements: string;
  productPlacement: string;
}> = {
  1: {
    role: '히어로 배너 — 첫인상, 브랜드 아이덴티티 확립',
    layout: `화면 상단 40%: 큰 헤드라인 타이포그래피 (볼드, 서체 믹스)
화면 하단 60%: 제품 패키지 2~3개를 나란히 또는 피라미드로 배치
제품 주변에 원재료/소품을 자연스럽게 흩뿌리듯 배치 (scattered styling)
배경은 단일 따뜻한 톤 (베이지/크림/아이보리)`,
    typography: `헤드라인: 40pt+ 굵은 고딕체, 제품명 또는 핵심 카피
서브카피: 16pt 라이트체, 헤드라인 바로 아래
어두운 원형 뱃지 안에 핵심 수치 (예: "단백질 7g", "저당")`,
    graphicElements: `원형/라운드 뱃지 2~3개 (핵심 스펙 강조)
제품 뒤편 은은한 그라데이션 또는 방사형 빛`,
    productPlacement: '제품 패키지 전면 노출, 크고 선명하게, 2~3개 변형 보여주기',
  },
  2: {
    role: '공감/문제 제기 — 타겟 고객의 고민에 공감',
    layout: `화면을 2~3개 컬러 존으로 분할 (삼각형/대각선/곡선 분할)
각 존마다 다른 제품 변형 또는 맛/옵션 배치
"NEW" 또는 강조 뱃지 활용`,
    typography: `대비되는 컬러 텍스트 (각 존의 배경색에 맞춘 글자색)
질문형 헤드라인 ("이런 고민 있으시죠?")
각 존마다 짧은 라벨 텍스트`,
    graphicElements: `컬러 존 분할선 (대각선, 곡선, 삼각형)
각 존 안에 맞는 소품/원재료 흩뿌리기
작은 플래그/스티커 뱃지 ("NEW", "인기")`,
    productPlacement: '각 컬러 존마다 1개씩 제품 배치, 해당 변형에 맞는 소품과 함께',
  },
  3: {
    role: '핵심 포인트 — POINT.01 스타일 구조화된 베네핏',
    layout: `상단: "POINT.01 | 핵심키워드" 형태의 구조화된 헤더
중앙: 큰 숫자 강조 (예: "7g", "30%") + 보조 설명
하단: 제품 패키지 + 비교 시각화 (예: 달걀 1개 = 1팩)
깔끔한 그리드 레이아웃`,
    typography: `"POINT.01" 라벨: 작은 영문 세리프 또는 산세리프, 구분선(|) 포함
숫자 강조: 60pt+ 초대형 볼드 (컬러 악센트)
보조 설명: 14pt 라이트체`,
    graphicElements: `포인트 넘버링 라벨 ("POINT.01 | 더:건강하게")
비교 인포그래픽 (달걀 = 팝칩 1봉 같은)
원형 아이콘 + 일러스트 (근육, 설탕, 닭고기 등)`,
    productPlacement: '제품 패키지 1개 + 비교 대상 소품',
  },
  4: {
    role: '베네핏 상세 — 아이콘 그리드 레이아웃',
    layout: `2x2 또는 1x3 그리드 레이아웃
각 칸: 원형 아이콘(일러스트) + 짧은 제목 + 1줄 설명
그리드 상단에 섹션 헤드라인
전체적으로 깔끔하고 스캔 가능한 구조`,
    typography: `섹션 헤드라인: 24pt 볼드
각 베네핏 제목: 16pt 미디엄
설명 텍스트: 12pt 라이트
아이콘 아래 텍스트 중앙 정렬`,
    graphicElements: `원형 배경의 라인 아이콘 또는 미니 일러스트 (4개)
예: 💪근육팔, 🍬설탕큐브에X, 🍗닭고기, 🧬분자구조
각 아이콘에 통일된 악센트 컬러 원형 배경
아이콘 사이 균일한 간격`,
    productPlacement: '그리드 아래 또는 옆에 제품 패키지 작게 배치',
  },
  5: {
    role: '제품 상세/스펙 — POINT.02 스타일',
    layout: `상단: "POINT.02 | 키워드" 구조화 헤더
좌측: 제품 패키지 대형 이미지 (기울임 또는 3D 각도)
우측: 스펙 리스트 또는 성분 하이라이트
하단: 인증/수상 뱃지 나열`,
    typography: `포인트 라벨 헤더 일관된 스타일 유지
스펙 수치: 볼드 + 악센트 컬러
단위: 라이트체로 수치 옆에`,
    graphicElements: `인증 마크 뱃지 (HACCP, 식약처 등)
성분 표시 그래픽 (원형 차트, 진행 바)
깔끔한 구분선 또는 점선`,
    productPlacement: '제품 패키지 대형, 성분 표시면이 보이도록 각도 조절',
  },
  6: {
    role: '사용법/TPO — 라이프스타일 연출',
    layout: `헤드라인: 볼드 타이포 "이럴때 OO 하세요!" 스타일
체크리스트 형태: ✓ 사용 상황 1, ✓ 사용 상황 2, ✓ 사용 상황 3
옆이나 아래에 제품 라인업 사진
따뜻한 라이프스타일 분위기`,
    typography: `헤드라인: 28pt 볼드, 감탄사/명령형 톤
체크리스트: 16pt, 체크 아이콘 + 텍스트
각 항목 사이 충분한 간격`,
    graphicElements: `체크마크(✓) 또는 커스텀 체크 아이콘
사용 상황 미니 일러스트 (아침, 운동 후, 간식 시간)
구분선 또는 배경 패턴`,
    productPlacement: '제품 라인업 3~4개를 일렬로 배치, 상황 연출과 함께',
  },
  7: {
    role: '신뢰/소셜프루프 — POINT.03 스타일',
    layout: `상단: "POINT.03 | 키워드" 구조화 헤더
중앙: 핵심 수치 대형 타이포 (만족도 %, 판매량)
하단: 인증서, 수상 내역, 미디어 로고 나열
전체적으로 신뢰감 주는 깔끔한 레이아웃`,
    typography: `핵심 수치: 48pt+ 초대형 볼드 (악센트 컬러)
보조 텍스트: 14pt
인증/수상 라벨: 10pt 캡션`,
    graphicElements: `별점 ★★★★★ 그래픽
원형 만족도 차트
인증 마크 뱃지 가로 나열
신뢰 관련 아이콘 (방패, 체크마크, 메달)`,
    productPlacement: '제품 패키지와 인증 마크를 함께 배치',
  },
  8: {
    role: '마무리 — 브랜드 정리, 감성 클로징',
    layout: `미니멀한 구성: 헤드라인 + 제품 뷰티샷
제품 패키지를 중앙에 프리미엄하게 배치
주변에 핵심 키워드 해시태그 뱃지 (#키워드1 #키워드2)
여백을 충분히 활용한 고급스러운 구성`,
    typography: `감성적인 헤드라인: 28pt 세리프 또는 캘리그래피풍
해시태그 뱃지: 12pt, 라운드 배경
서브카피: 16pt 라이트, 브랜드 메시지`,
    graphicElements: `해시태그 스타일 뱃지 (#군옥수수 #매콤살사 같은)
미니멀한 장식 라인 또는 프레임
은은한 그라데이션 배경
제품 아래 그림자로 고급감`,
    productPlacement: '제품 패키지 중앙 배치, 뷰티샷 스타일, 깨끗한 배경',
  },
};

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
  } = options;

  const headline = inputHeadline || section.headline || '';
  const subCopy = inputSubCopy || section.subCopy || '';
  const userVisualPrompt = inputVisualPrompt || '';

  const sectionRefs = sectionReferences[index] || [];
  const hasRefs =
    sectionRefs.length > 0 || uploadedImages.references.length > 0;
  const hasProduct = uploadedImages.product.length > 0;
  const hasPackage = uploadedImages.package.length > 0;

  // 비율 정보
  const aspectRatioText: Record<string, string> = {
    '1:1': 'SQUARE format (1:1)',
    '3:4': 'VERTICAL format (3:4) - portrait, taller than wide',
    '4:3': 'HORIZONTAL format (4:3) - landscape, wider than tall',
    '9:16': 'TALL VERTICAL format (9:16) - mobile-optimized',
    '16:9': 'WIDE BANNER format (16:9) - cinematic',
  };
  const ratioDesc =
    aspectRatioText[selectedAspectRatio] || aspectRatioText['3:4'];

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
      selectedAspectRatio,
      hasProduct,
      hasPackage,
    });
  }

  // ===== 기존 프롬프트 (designBrief 없을 때 fallback) =====
  const catStyle = CATEGORY_STYLING[category] || CATEGORY_STYLING['other'];
  const sectionLayout = SECTION_LAYOUTS[section.number] || SECTION_LAYOUTS[1];

  let prompt = `You are a professional Korean e-commerce detail page designer.
Create a SINGLE section image that looks like part of a cohesive, professionally designed product detail page (상세페이지).

=== IMAGE FORMAT ===
📐 ${ratioDesc} — MUST generate in exactly ${selectedAspectRatio} ratio.

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

=== 텍스트 (한국어, 이미지 안에 렌더링) ===
헤드라인: ${headline}
서브카피: ${subCopy}

텍스트 규칙:
- 위의 헤드라인과 서브카피만 이미지에 포함
- 한글 타이포그래피: 깔끔하고 현대적, 가독성 높게
- 섹션 라벨("히어로 배너", "솔루션", "CTA" 등) 절대 표시 금지
- "USP", "제품 상세", "구매 유도" 같은 메타 텍스트 금지

=== 프로페셔널 디자인 핵심 원칙 ===
1. **그래픽 디자인**: 단순 사진이 아닌, 그래픽 요소(뱃지, 아이콘, 장식 도형)가 포함된 디자인 작업물
2. **연출 사진**: 제품 + 원재료/소품을 예술적으로 배치한 스타일드 포토그래피
3. **일관된 톤앤매너**: 배경색, 서체 스타일, 여백이 다른 섹션과 통일감 유지
4. **정보 계층**: 헤드라인 > 핵심 수치/뱃지 > 서브카피 > 상세 텍스트 순서
5. **한국 이커머스 스타일**: 빙그레, CJ, 농심 등 대기업 상세페이지 품질 수준`;

  if (hasProduct || hasPackage) {
    prompt += `

=== 제품/패키지 이미지 (최우선 참고) ===
제공된 제품/패키지 이미지에서:
- 제품 외형을 정확하게 재현 (형태, 색상, 로고, 패턴)
- 패키지 색상에서 전체 디자인 컬러 팔레트 추출
- 제품 브랜드 아이덴티티를 디자인에 반영`;
  }

  if (hasRefs) {
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

  prompt += `

=== 출력 품질 ===
- 고해상도, 프로페셔널 이커머스 상세페이지 품질
- 단일 섹션 이미지 (콜라주/다중 섹션 금지)
- 한국 온라인 쇼핑몰 상세페이지 수준의 완성도`;

  return prompt;
}

// visualMode별 제품 이미지 포함 여부
function shouldIncludeProductImages(mode: VisualMode): boolean {
  switch (mode) {
    case 'product-hero':
    case 'product-detail':
    case 'lifestyle':
      return true;
    case 'infographic':
    case 'emotional':
    case 'social-proof':
      return false;
    default:
      return true;
  }
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
- 제품의 원재료, 성분, 질감을 클로즈업으로 보여주기
- 제품 일부분을 확대하거나 단면/내용물 연출
- 첨부된 제품 이미지를 참고하되, 디테일 컷/확대 앵글로 변환
- 소재감, 텍스처가 느껴지도록 사실적 렌더링`;

    case 'infographic':
      return `📊 인포그래픽 모드:
- ⚠️ 제품 패키지 이미지를 이 섹션에 배치하지 마세요
- 아이콘, 차트, 배지, 숫자 중심의 순수 정보 시각화
- 깔끔한 그래픽 디자인 — 일러스트/아이콘/도형으로 정보 전달
- 비교 인포그래픽, 원형 차트, 진행 바, 체크리스트 등 활용
- 배경은 단색 또는 그라데이션, 텍스처 최소화`;

    case 'lifestyle':
      return `🏠 라이프스타일 모드:
- 실제 사용 장면, TPO(시간/장소/상황) 연출
- 첨부된 제품 이미지를 참고하여 제품을 자연스러운 생활 환경에 배치
- 사람 손, 테이블, 부엌, 사무실 등 실생활 컨텍스트
- 제품은 등장하되 환경/분위기가 주인공`;

    case 'emotional':
      return `💫 감성 모드:
- ⚠️ 제품 패키지 이미지를 이 섹션에 배치하지 마세요
- 브랜드 감성과 분위기 중심 — 추상적/무드 중심 이미지
- 컬러, 텍스처, 빛, 자연 요소로 감정 전달
- 제품 없이 순수하게 무드와 가치를 전달하는 비주얼
- 시각적 쉼표 역할 — 정보 밀도 낮추기`;

    case 'social-proof':
      return `⭐ 소셜프루프 모드:
- ⚠️ 제품 패키지 이미지를 이 섹션에 배치하지 마세요
- 후기, 인증, 수상 배지, 만족도 수치 중심
- 별점 그래픽, 만족도 차트, 인증 마크 배지 나열
- 신뢰감을 주는 깔끔하고 공신력 있는 레이아웃
- 숫자/퍼센트를 초대형 타이포로 강조`;

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
  }
): string {
  const {
    designBrief, productName, productFeatures, targetAudience,
    headline, subCopy, userVisualPrompt, additionalNotes,
    ratioDesc, selectedAspectRatio, hasProduct, hasPackage,
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

━━ 텍스트 (한국어, 이미지 안에 렌더링) ━━
헤드라인: ${headline}
서브카피: ${subCopy}

텍스트 규칙:
- 위의 헤드라인과 서브카피만 이미지에 포함
- 한글 타이포그래피: 깔끔하고 현대적, 가독성 높게
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

━━ 추가 지시 ━━
${userVisualPrompt}`;
  }

  if (additionalNotes.trim()) {
    prompt += `

━━ 글로벌 스타일 요구사항 ━━
${additionalNotes}`;
  }

  prompt += `

━━ 필수 규칙 ━━
- 고해상도, 프로페셔널 한국 이커머스 상세페이지 품질
- 단일 섹션 이미지 (콜라주/다중 섹션 금지)
- 문장형 텍스트 최소화, 타이포/아이콘/그래픽으로 정보 전달
- 핵심 수치/키워드는 대형 타이포로 강조
- 한국 온라인 쇼핑몰 상세페이지 수준의 완성도`;

  return prompt;
}

// ===== 통합 이미지 생성 함수 =====

interface GenerateImageResult {
  dataUrl: string;
  base64: string;
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
    category,
    productFeatures,
    additionalNotes,
    generatedSections,
    refStrength,
    headline,
    subCopy,
    userVisualPrompt,
    targetAudience,
    designBrief,
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
    if (includeGenerated && generatedImages[index]?.base64) {
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
    if (includeGenerated && generatedImages[index]?.base64) {
      const existingImg = `data:image/png;base64,${generatedImages[index].base64}`;
      const compressed = await compressImageForAPI(existingImg);
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: compressed.split(',')[1],
        },
      });
    }

    // 제품 이미지 (최대 1장, 압축)
    if (uploadedImages.product.length > 0) {
      const compressed = await compressImageForAPI(uploadedImages.product[0]);
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: compressed.split(',')[1],
        },
      });
    }

    // 패키지 이미지 (최대 1장, 압축)
    if (uploadedImages.package.length > 0) {
      const compressed = await compressImageForAPI(uploadedImages.package[0]);
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: compressed.split(',')[1],
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
          data: compressed.split(',')[1],
        },
      });
    }

    // 추가 레퍼런스 이미지 (최대 1장, 압축)
    if (includeReference && step3Refs.length > 0) {
      const compressed = await compressImageForAPI(step3Refs[0]);
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: compressed.split(',')[1],
        },
      });
    }
  } else {
    // ===== 기본 모드 (STEP 2 / 일반 생성) =====
    prompt = buildImagePrompt(section, index, {
      productName,
      category,
      productFeatures,
      additionalNotes,
      uploadedImages,
      sectionReferences,
      refStrength,
      generatedSections,
      selectedAspectRatio,
      headline,
      subCopy,
      userVisualPrompt,
      targetAudience,
      designBrief,
    });

    parts.push({ text: prompt });

    if (designBrief) {
      // ===== DesignBrief 모드: visualMode에 따라 제품 이미지 포함 여부 결정 =====
      const strategy = designBrief.sectionStrategies.find(
        (s) => s.sectionNumber === section.number
      ) || designBrief.sectionStrategies[index];

      const visualMode = strategy?.visualMode || 'product-hero';
      const needsProductImages = shouldIncludeProductImages(visualMode);

      if (needsProductImages) {
        // 제품 이미지가 필요한 모드: product-hero, product-detail, lifestyle
        const maxProduct = Math.min(uploadedImages.product.length, 2);
        for (let i = 0; i < maxProduct; i++) {
          const compressed = await compressImageForAPI(uploadedImages.product[i]);
          parts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: compressed.split(',')[1],
            },
          });
        }

        const maxPackage = Math.min(uploadedImages.package.length, 2);
        for (let i = 0; i < maxPackage; i++) {
          const compressed = await compressImageForAPI(uploadedImages.package[i]);
          parts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: compressed.split(',')[1],
            },
          });
        }
      }
      // infographic, emotional, social-proof → 제품 이미지 미포함
    } else {
      // ===== 기존 모드: 각 슬롯 1장씩 =====
      if (uploadedImages.product.length > 0) {
        const compressed = await compressImageForAPI(uploadedImages.product[0]);
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: compressed.split(',')[1],
          },
        });
      }

      if (uploadedImages.package.length > 0) {
        const compressed = await compressImageForAPI(uploadedImages.package[0]);
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: compressed.split(',')[1],
          },
        });
      }

      // 레퍼런스 이미지 (기존 방식: 최대 1장)
      const sectionRefs = sectionReferences[index] || [];
      const refToUse =
        sectionRefs.length > 0
          ? sectionRefs[0]
          : uploadedImages.references.length > 0
            ? uploadedImages.references[0]
            : null;
      if (refToUse) {
        const compressed = await compressImageForAPI(refToUse);
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: compressed.split(',')[1],
          },
        });
      }
    }
  }

  // ===== Gemini API 호출 (공통) =====
  const geminiUrl = useBackend
    ? `${backendUrl}/api/gemini`
    : `https://generativelanguage.googleapis.com/v1beta/models/${modelConfig.model}:generateContent?key=${geminiApiKey}`;

  const reqBody: Record<string, unknown> = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      ...getModelConfigWithRatio(modelConfig.config, selectedAspectRatio),
    },
  };
  if (useBackend) reqBody.model = modelConfig.model;

  const response = await fetchWithTimeout(
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
          base64: part.inlineData.data!,
          prompt: step3Options ? prompt : section.visualPrompt,
        };
      }
    }
  }

  throw new Error('이미지가 생성되지 않았습니다.');
}
