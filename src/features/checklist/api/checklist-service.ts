// ===== CHECKLIST SERVICE =====
// 상세페이지 품질 체크리스트 분석 서비스 (순수 함수, DOM 접근 없음)

import { CATEGORY_CHECKLISTS, COMMON_CHECKLIST } from '@/shared/config/category-data';
import type {
  AnalysisData,
  Category,
  ChecklistResult,
  GeneratedImage,
  ImageAnalysisResult,
  PriceRange,
  Section,
} from '@/shared/types';

// ===== Gemini Vision 분석용 파트 타입 =====
interface TextPart {
  text: string;
}

interface InlineDataPart {
  inlineData: {
    mimeType: string;
    data: string;
  };
}

type GeminiPart = TextPart | InlineDataPart;

interface AnalyzeConfig {
  useBackend: boolean;
  backendUrl: string;
  geminiApiKey: string;
}

interface CollectAnalysisDataParams {
  productName: string;
  category: Category;
  priceRange: PriceRange;
  productFeatures: string;
  generatedSections: Section[];
  generatedImages: Record<number, GeneratedImage>;
}

// ===== IMAGE ANALYSIS WITH GEMINI VISION =====
export async function analyzeGeneratedImages(
  generatedImages: Record<number, GeneratedImage>,
  config: AnalyzeConfig
): Promise<ImageAnalysisResult> {
  const { useBackend, backendUrl, geminiApiKey } = config;

  // 생성된 이미지가 없으면 빈 결과 반환
  const images = Object.values(generatedImages).filter((img) => img && !img.error);
  if (images.length === 0 || (!useBackend && !geminiApiKey)) {
    return { analyzed: false };
  }

  try {
    // 첫 3개 이미지만 분석 (API 비용 절약)
    const imagesToAnalyze = images.slice(0, 3);

    const parts: GeminiPart[] = [
      {
        text: `다음 이미지들은 e-커머스 상세페이지용 이미지입니다. 각 이미지를 분석하여 아래 항목들의 존재 여부를 JSON으로 답해주세요.

분석 항목:
- hasProductImage: 제품 실물이 보이는가
- hasPackageImage: 패키지/포장이 보이는가
- hasNutritionInfo: 영양정보/칼로리 표시가 있는가
- hasPriceInfo: 가격 정보가 있는가
- hasCTAButton: 구매 버튼이나 CTA 요소가 있는가
- hasReviewContent: 리뷰/후기 내용이 있는가
- hasCertification: 인증마크(HACCP 등)가 있는가
- hasIngredients: 원재료/성분 정보가 있는가
- textQuality: 텍스트 가독성 (good/medium/poor)
- designQuality: 전체 디자인 품질 (good/medium/poor)

JSON 형식으로만 답해주세요:
{"hasProductImage": true, "hasPackageImage": false, ...}`,
      },
    ];

    // 이미지 추가
    for (const img of imagesToAnalyze) {
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: img.data.split(',')[1],
        },
      });
    }

    const analysisUrl = useBackend
      ? `${backendUrl}/api/gemini`
      : `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

    const analysisBody: Record<string, unknown> = {
      contents: [{ parts }],
      generationConfig: { temperature: 0.1 },
    };
    if (useBackend) analysisBody.model = 'gemini-2.5-flash';

    const response = await fetch(analysisUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(analysisBody),
    });

    if (!response.ok) {
      console.error('Image analysis failed');
      return { analyzed: false };
    }

    const data = await response.json();
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // JSON 파싱
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]) as Omit<ImageAnalysisResult, 'analyzed'>;
      return { analyzed: true, ...result };
    }

    return { analyzed: false };
  } catch (error) {
    console.error('Image analysis error:', error);
    return { analyzed: false };
  }
}

// ===== 분석 데이터 수집 =====
// DOM 대신 모든 데이터를 파라미터로 받음
export function collectAnalysisData(params: CollectAnalysisDataParams): AnalysisData {
  const productName = params.productName || '';
  const category: Category = params.category || 'other';
  const priceRange = params.priceRange || '';
  const productFeatures = params.productFeatures || '';
  const { generatedSections, generatedImages } = params;

  // 섹션 데이터 수집
  const headlines = generatedSections.map((s) => s.headline || '');
  const subcopies = generatedSections.map((s) => s.subCopy || '');
  const allText = [...headlines, ...subcopies, productFeatures].join(' ');

  // 분석
  const headlineAvgLength =
    headlines.filter((h) => h).reduce((sum, h) => sum + h.length, 0) /
    (headlines.filter((h) => h).length || 1);
  const impactWords = ['최고', '완벽', '놀라운', '특별', '프리미엄', 'BEST', '인기', '1위', '혁신', '새로운'];
  const hasImpactWords = impactWords.some((w) => allText.includes(w));
  const ctaWords = ['지금', '구매', '주문', '클릭', '바로', '할인', '무료배송', '오늘만'];
  const hasCTA = ctaWords.some((w) => allText.includes(w));
  const productNameClear = headlines.some((h) => h.includes(productName.split(' ')[0]));

  // 리뷰/후기 섹션 체크
  const hasReviewSection = generatedSections.some(
    (s) =>
      (s.name || '').includes('후기') ||
      (s.name || '').includes('리뷰') ||
      (s.headline || '').includes('후기') ||
      (s.headline || '').includes('리뷰')
  );

  // 카테고리별 체크
  const categoryKeywords: Record<string, Record<string, string[]>> = {
    snack: {
      nutrition: ['칼로리', 'kcal', '단백질', '탄수화물'],
      taste: ['맛', '달콤', '짭짤', '고소'],
      texture: ['바삭', '쫀득', '부드러운', '크런치'],
      certification: ['HACCP', '인증', 'ISO'],
    },
    beverage: {
      nutrition: ['칼로리', '당류'],
      storage: ['냉장', '보관'],
      caffeine: ['카페인', 'mg'],
    },
    health: {
      dosage: ['1일', '섭취', '복용'],
      certification: ['건강기능식품', '식약처'],
      caution: ['주의', '임산부'],
    },
    beauty: {
      usage: ['사용법', '바르', '도포'],
      skintype: ['지성', '건성', '복합성', '민감성'],
      certification: ['식약처'],
    },
    instant: {
      expiry: ['유통기한', '소비기한'],
      storage: ['냉장', '냉동', '실온'],
      cooking: ['조리', '데워', '끓여'],
    },
  };

  const categoryChecks: Record<string, boolean> = {};
  if (categoryKeywords[category]) {
    for (const [key, keywords] of Object.entries(categoryKeywords[category])) {
      categoryChecks[key] = keywords.some((k) => allText.includes(k));
    }
  }

  // 이미지 존재 여부 체크 (generatedImages에서)
  const imageValues = Object.values(generatedImages || {});
  const hasProductImage = imageValues.some((img) => img && !img.error);
  const hasPackageImage = imageValues.some((img) => img && !img.error);

  return {
    category,
    productName,
    sectionCount: generatedSections.length,
    headlineAvgLength: Math.round(headlineAvgLength),
    hasImpactWords,
    hasCTA,
    productNameClear,
    hasProductImage,
    hasPackageImage,
    hasReviewSection,
    hasPriceInfo: !!priceRange,
    categoryChecks,
    allText,
  };
}

// ===== 체크리스트 결과 생성 =====
export function generateChecklistResult(data: AnalysisData): ChecklistResult {
  const results: ChecklistResult = {
    categories: [],
    totalScore: 0,
    maxScore: 0,
    suggestions: [],
    imageAnalyzed: false,
  };
  const imgAnalysis: ImageAnalysisResult = data.imageAnalysis || ({} as ImageAnalysisResult);

  // 이미지 분석 결과가 있으면 데이터 업데이트
  if (imgAnalysis.analyzed) {
    results.imageAnalyzed = true;
    // 이미지 분석 결과로 기존 데이터 보완/덮어쓰기
    if (imgAnalysis.hasProductImage !== undefined)
      data.hasProductImage = data.hasProductImage || imgAnalysis.hasProductImage;
    if (imgAnalysis.hasPackageImage !== undefined)
      data.hasPackageImage = data.hasPackageImage || imgAnalysis.hasPackageImage;
    if (imgAnalysis.hasCTAButton !== undefined) data.hasCTA = data.hasCTA || imgAnalysis.hasCTAButton;
    if (imgAnalysis.hasReviewContent !== undefined)
      data.hasReviewSection = data.hasReviewSection || imgAnalysis.hasReviewContent;
    if (imgAnalysis.hasPriceInfo !== undefined) data.hasPriceInfo = data.hasPriceInfo || imgAnalysis.hasPriceInfo;

    // 카테고리 체크에 이미지 분석 결과 반영
    if (imgAnalysis.hasNutritionInfo) data.categoryChecks.nutrition = true;
    if (imgAnalysis.hasIngredients) data.categoryChecks.ingredients = true;
    if (imgAnalysis.hasCertification) data.categoryChecks.certification = true;
  }

  // 공통 체크리스트
  for (const [_key, category] of Object.entries(COMMON_CHECKLIST)) {
    const categoryResult: ChecklistResult['categories'][number] = { ...category, results: [] };
    for (const item of category.items) {
      const passed = item.check!(data);
      categoryResult.results.push({ ...item, passed });
      results.maxScore++;
      if (passed) results.totalScore++;
      if (!passed) {
        results.suggestions.push(getSuggestion(item.id, data));
      }
    }
    results.categories.push(categoryResult);
  }

  // 카테고리별 체크리스트
  const categoryConfig = CATEGORY_CHECKLISTS[data.category] || CATEGORY_CHECKLISTS.other;
  const categoryResult: ChecklistResult['categories'][number] = {
    name: `${categoryConfig.icon} ${categoryConfig.name} 필수정보`,
    icon: categoryConfig.icon,
    items: categoryConfig.items,
    results: [],
  };
  for (const item of categoryConfig.items) {
    const passed = data.categoryChecks[item.id] || false;
    categoryResult.results.push({ ...item, passed });
    results.maxScore++;
    if (passed) results.totalScore++;
    if (!passed) {
      results.suggestions.push(getCategorySuggestion(item.id, item.label, data.category));
    }
  }
  results.categories.push(categoryResult);

  // 이미지 품질 카테고리 추가 (분석된 경우)
  if (imgAnalysis.analyzed) {
    const imageQualityResult: ChecklistResult['categories'][number] = {
      name: '🎨 이미지 품질 (AI 분석)',
      icon: '🎨',
      items: [],
      results: [],
    };

    imageQualityResult.results.push({
      id: 'text_quality',
      label: '텍스트 가독성',
      detail:
        imgAnalysis.textQuality === 'good'
          ? '좋음'
          : imgAnalysis.textQuality === 'medium'
            ? '보통'
            : '개선 필요',
      passed: imgAnalysis.textQuality === 'good' || imgAnalysis.textQuality === 'medium',
    });

    imageQualityResult.results.push({
      id: 'design_quality',
      label: '디자인 품질',
      detail:
        imgAnalysis.designQuality === 'good'
          ? '좋음'
          : imgAnalysis.designQuality === 'medium'
            ? '보통'
            : '개선 필요',
      passed: imgAnalysis.designQuality === 'good' || imgAnalysis.designQuality === 'medium',
    });

    for (const item of imageQualityResult.results) {
      results.maxScore++;
      if (item.passed) results.totalScore++;
    }

    results.categories.push(imageQualityResult);
  }

  return results;
}

// ===== 개선 제안 =====
export function getSuggestion(itemId: string, data: AnalysisData): string {
  const suggestions: Record<string, string> = {
    headline_length: `헤드라인이 평균 ${data.headlineAvgLength}자입니다. 15자 이내로 줄여 임팩트를 높여보세요.`,
    headline_impact: '헤드라인에 "최고", "특별", "프리미엄" 등 임팩트 있는 단어를 추가해보세요.',
    cta_exists: '"지금 구매하기", "오늘만 할인" 등 구매를 유도하는 CTA 문구를 추가하세요.',
    product_name: '헤드라인에 제품명을 포함시켜 브랜드 인지도를 높이세요.',
    product_image: '제품 실물 이미지를 추가하면 신뢰도가 높아집니다.',
    section_count: '섹션을 6개 이상으로 늘려 더 풍부한 정보를 제공하세요.',
    package_image: '패키지 이미지를 추가하면 실제 배송 시 모습을 보여줄 수 있습니다.',
    review_section: '고객 후기 섹션을 추가하여 구매 전환율을 높이세요.',
    price_info: '가격 정보를 명시하면 고객의 의사결정에 도움이 됩니다.',
  };
  return suggestions[itemId] || `${itemId} 항목을 개선해보세요.`;
}

// ===== 카테고리별 개선 제안 =====
export function getCategorySuggestion(_itemId: string, label: string, category: Category): string {
  return `[${CATEGORY_CHECKLISTS[category]?.name || '카테고리'}] ${label} 정보를 상세페이지에 추가하세요.`;
}
