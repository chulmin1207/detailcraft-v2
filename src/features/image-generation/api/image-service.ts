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
}

/**
 * 섹션별 이미지 생성 프롬프트를 빌드하는 핵심 함수
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
  } = options;

  const headline = inputHeadline || section.headline || '';
  const subCopy = inputSubCopy || section.subCopy || '';
  const userVisualPrompt = inputVisualPrompt || '';

  const sectionRefs = sectionReferences[index] || [];
  const hasRefs =
    sectionRefs.length > 0 || uploadedImages.references.length > 0;
  const hasProduct = uploadedImages.product.length > 0;
  const hasPackage = uploadedImages.package.length > 0;

  // 카테고리 매핑 (일반적인 촬영/연출 스타일만)
  const categoryMap: Record<string, string> = {
    snack:
      'Food photography style - appetizing presentation, highlight texture and appeal',
    beverage:
      'Beverage photography style - liquid dynamics, condensation, refreshing presentation',
    instant:
      'Food photography style - appetizing, convenient meal presentation, steam/warmth',
    health:
      'Health/wellness photography style - clean, trustworthy, professional medical aesthetic',
    beauty:
      'Beauty/cosmetics photography style - soft lighting, skin-friendly, elegant presentation',
    living: 'Product photography style - clean, practical, lifestyle context',
    other: 'Professional e-commerce product photography style',
  };

  // 섹션별 레이아웃 가이드 (CRO 관점 + 각 섹션마다 다른 스타일)
  const sectionLayoutGuide: Record<number, string> = {
    1: `HERO BANNER - 첫인상
- Large, impactful hero image with product as the star
- Bold headline at top or center (핵심 약속)
- Sub-copy visible below headline
- Premium, trustworthy first impression
- Product prominently featured
- NO explicit CTA button in image`,

    2: `PROBLEM/EMPATHY - 공감 유발
- Lifestyle scene showing the pain point
- Relatable everyday frustration
- "이런 고민 있으시죠?" feeling
- Person-focused, emotional approach
- Soft, empathetic mood
- NO product in this section`,

    3: `SOLUTION - 해결책 제시
- Product as the hero solving the problem
- Bright, positive, hopeful mood
- "이제 해결됩니다" transformation feel
- Before/after concept if applicable
- Focus on BENEFIT, not selling
- NO "지금 구매" or CTA buttons`,

    4: `BENEFITS (3가지) - 핵심 베네핏
- Clean infographic layout
- 3 benefit boxes or icons
- Each benefit with icon + short text
- Scannable, easy to understand
- Feature + Benefit language
- Product integrated with benefits`,

    5: `PRODUCT DETAIL / SPEC
- Close-up product shots
- Ingredient or material highlight
- Technical specifications
- Certifications or quality marks
- Detailed, informative layout
- Trust-building details`,

    6: `USAGE / TPO - 사용법
- Product in use scenario
- Step-by-step or situation-based
- Morning/evening, home/office context
- Practical, relatable scenes
- Easy to follow visual guide
- Lifestyle integration`,

    7: `TRUST / SOCIAL PROOF - 신뢰
- Customer reviews or testimonials
- Star ratings, satisfaction %
- Certifications, awards, media
- "OO만명이 선택" social proof
- Trust badges prominent
- NO aggressive CTA`,

    8: `CLOSING - 마무리 정리
- Product beauty shot
- Key benefits summary (subtle)
- Brand message or tagline
- Clean, premium closing feel
- Soft invitation, NOT hard sell
- NO "지금 구매", "바로 주문" buttons`,
  };

  const layoutGuide =
    sectionLayoutGuide[section.number] || sectionLayoutGuide[1];
  const categoryDescription = categoryMap[category] || categoryMap['other'];

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

  let prompt = `Create a HIGH-QUALITY e-commerce product detail page image for Korean market.

=== ⚠️ CRITICAL: IMAGE ASPECT RATIO (MUST FOLLOW) ===
📐 **${ratioDesc}**
🎯 GENERATE THE IMAGE IN EXACTLY ${selectedAspectRatio} ASPECT RATIO
- This is NOT optional - the output image MUST be ${selectedAspectRatio}
- Do NOT generate square or any other ratio

=== CRITICAL: SINGLE SECTION IMAGE ===
⚠️ THIS IS THE MOST IMPORTANT RULE:
- Create ONE single focused image for THIS SECTION ONLY
- DO NOT create a collage or multi-section layout
- DO NOT combine multiple scenes or stack sections
- ONE clear visual concept, ONE focused composition

=== SECTION-SPECIFIC LAYOUT (MUST FOLLOW) ===
This is Section ${section.number}: ${section.name}
${layoutGuide}

=== PRODUCT CATEGORY ===
${categoryDescription}

=== PRODUCT INFORMATION ===
Product Name: ${productName}
Product Features: ${productFeatures}
Target Audience: ${targetAudience}

=== TEXT TO DISPLAY IN IMAGE ===
Main Headline (Korean): ${headline}
Sub Copy (Korean): ${subCopy}

CRITICAL TEXT RULES:
- ONLY include the headline and sub copy above
- Korean text must be clear, legible, modern typography
- DO NOT add section labels like "히어로 배너", "USP", "CTA"

⚠️ FORBIDDEN TEXT:
- "${section.name}", "USP", "제품 상세", "히어로 배너", "솔루션", "CTA", "구매 유도"`;

  if (hasProduct || hasPackage) {
    prompt += `

=== PRODUCT IMAGES (COLOR SOURCE - HIGHEST PRIORITY) ===
⚠️ CRITICAL: Extract ALL colors from product/package images.
- Color palette MUST come from the actual product/package
- Brand colors from packaging
- The product must be accurately represented
- Match the product's actual appearance exactly`;
  }

  if (hasRefs) {
    if (refStrength === 'strong') {
      prompt += `

=== REFERENCE IMAGES (STYLE SOURCE) ===
From the reference images, extract and apply:
- Overall mood and atmosphere
- Typography style and text treatment
- Background style, texture, and gradients
- Visual composition feeling and layout flow
- Design aesthetic and quality level

⚠️ IMPORTANT:
- Colors must come from PRODUCT images, NOT from references
- Use reference for STYLE/MOOD/TYPOGRAPHY only`;
    } else {
      prompt += `

=== REFERENCE IMAGES (LAYOUT ONLY) ===
Use reference images ONLY for layout and composition inspiration.
DO NOT copy colors, style, or mood from references.
Use PRODUCT colors and default professional style.`;
    }
  }

  if (userVisualPrompt.trim()) {
    prompt += `

=== SECTION-SPECIFIC INSTRUCTIONS ===
${userVisualPrompt}`;
  }

  // 추가 요청사항 (STEP 1에서 입력한 전체 스타일 가이드)
  if (additionalNotes.trim()) {
    prompt += `

=== GLOBAL STYLE REQUIREMENTS (HIGHEST PRIORITY) ===
The user has specified the following requirements that MUST be applied:
${additionalNotes}

IMPORTANT: These global requirements override default styles.`;
  }

  prompt += `

=== OUTPUT ===
- High resolution, professional e-commerce quality
- Clean, polished result for Korean online shopping platforms
- Make this section visually DISTINCT from other sections`;

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
    });

    parts.push({ text: prompt });

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

    // 레퍼런스 이미지 (최대 1장, 압축)
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
