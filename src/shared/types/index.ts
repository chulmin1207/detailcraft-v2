// ===== 카테고리 & 가격 =====
export type Category = 'snack' | 'beverage' | 'instant' | 'health' | 'beauty' | 'living' | 'other';
export type PriceRange = string;
export type ModelType = 'fast' | 'quality';
export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
export type RefStrength = 'strong' | 'light';
export type ThemeMode = 'dark' | 'light';
export type ToastType = 'success' | 'error' | 'info';

// ===== 섹션 =====
export interface Section {
  number: number;
  name: string;
  purpose: string;
  headline: string;
  subCopy: string;
  visualPrompt: string;
  headlineAlts: string[];
  subCopyAlts: string[];
  visualPromptAlts: string[];
}

// ===== 생성된 이미지 =====
export interface GeneratedImage {
  data: string;       // dataUrl
  base64: string;
  prompt: string;
  error?: string;
}

// ===== 업로드 이미지 =====
export interface UploadedImages {
  product: string[];
  package: string[];
  references: string[];
}

// ===== 모델 설정 =====
export interface ModelConfig {
  name: string;
  model: string;
  timeout: number;
  config: Record<string, unknown>;
  description: string;
}

// ===== 플랫폼 설정 =====
export interface PlatformConfig {
  name: string;
  folder: string;
  width: number;
}

// ===== 디자인 브리프 (비전 분석 결과) =====
export interface DesignBrief {
  purchaseAnalysis: PurchaseAnalysis;
  sectionStrategies: SectionStrategy[];
  designGuide: DesignGuide | null;
  cdReview: string;
}

export interface PurchaseAnalysis {
  buyingMotivation: string;
  purchaseBarriers: string;
  decisiveMessage: string;
  competitiveDiff: string;
}

export type VisualMode = 'product-hero' | 'product-detail' | 'infographic' | 'lifestyle' | 'emotional' | 'social-proof';

export interface SectionStrategy {
  sectionNumber: number;
  persuasionRole: string;
  visualMethod: string;
  informationVisualization: string;
  visualMode: VisualMode;
  visualVariation: {
    backgroundTone: string;
    layoutType: string;
    informationDensity: string;
    emotionCurve: string;
  };
}

export interface DesignGuide {
  colorUsage: string;
  typographyAndCopy: string;
  layoutAndPlacement: string;
  productPresentation: string;
  backgroundAndDecoration: string;
  informationVisualization: string;
}

// ===== 이미지 분석 결과 =====
export interface ImageAnalysis {
  productAppearance?: string;
  packageDesign?: string;
  textFromImage?: string;
  productCategory?: string;
  keyFeatures?: string[];
  moodAndTone?: string;
  targetAudienceGuess?: string;
  colorPalette?: string[];
  uniqueSellingPoints?: string[];
}

// ===== 카테고리 가이드 =====
export interface CategoryGuideItem {
  keywords: string;
  emotions: string;
  painPoints: string;
  trustElements: string;
}

// ===== 체크리스트 =====
export interface ChecklistItem {
  id: string;
  label: string;
  detail: string;
  check?: (data: AnalysisData) => boolean;
}

export interface ChecklistCategory {
  name: string;
  icon: string;
  items: ChecklistItem[];
}

export interface AnalysisData {
  category: Category;
  productName: string;
  sectionCount: number;
  headlineAvgLength: number;
  hasImpactWords: boolean;
  hasCTA: boolean;
  productNameClear: boolean;
  hasProductImage: boolean;
  hasPackageImage: boolean;
  hasReviewSection: boolean;
  hasPriceInfo: boolean;
  categoryChecks: Record<string, boolean>;
  allText: string;
  imageAnalysis?: ImageAnalysisResult;
}

export interface ImageAnalysisResult {
  analyzed: boolean;
  hasProductImage?: boolean;
  hasPackageImage?: boolean;
  hasNutritionInfo?: boolean;
  hasPriceInfo?: boolean;
  hasCTAButton?: boolean;
  hasReviewContent?: boolean;
  hasCertification?: boolean;
  hasIngredients?: boolean;
  textQuality?: 'good' | 'medium' | 'poor';
  designQuality?: 'good' | 'medium' | 'poor';
}

export interface ChecklistResult {
  categories: Array<ChecklistCategory & { results: Array<ChecklistItem & { passed: boolean }> }>;
  totalScore: number;
  maxScore: number;
  suggestions: string[];
  imageAnalyzed: boolean;
}

// ===== 인증 유저 =====
export interface User {
  email: string;
  name: string;
  picture?: string;
}

// ===== Toast =====
export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

// ===== Step 3 옵션 =====
export interface Step3Options {
  includeGenerated?: boolean;
  includeStep1Ref?: boolean;
  includeReference?: boolean;
  includePrompt?: boolean;
  step3Refs?: string[];
  step3Prompt?: string;
  generatedImages?: Record<number, GeneratedImage>;
}

// ===== API 설정 =====
export interface ApiConfig {
  useBackend: boolean;
  backendUrl: string;
  claudeApiKey: string;
  geminiApiKey: string;
  authToken?: string;
}

// ===== 이미지 생성 파라미터 =====
export interface GenerateImageParams {
  section: Section;
  index: number;
  modelConfig: ModelConfig;
  uploadedImages: UploadedImages;
  sectionReferences: Record<number, string[]>;
  step3Options?: Step3Options | null;
  useBackend: boolean;
  backendUrl: string;
  geminiApiKey: string;
  selectedAspectRatio: AspectRatio;
  productName: string;
  category: Category;
  productFeatures: string;
  additionalNotes: string;
  generatedSections: Section[];
  refStrength: RefStrength;
  headline?: string;
  subCopy?: string;
  userVisualPrompt?: string;
  targetAudience?: string;
  designBrief?: DesignBrief | null;
}
