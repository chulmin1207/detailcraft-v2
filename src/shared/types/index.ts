// ===== 기본 타입 =====
export type AspectRatio = '9:16' | '3:4' | '1:1' | '4:3' | '16:9';
export type GenerationTrack = 'plan' | 'simple';
export type ThemeMode = 'dark' | 'light';
export type ToastType = 'success' | 'error' | 'info';

// ===== 섹션 유형 =====
export type SectionType =
  | 'hero' | 'empathy' | 'point' | 'sizzle' | 'trust'
  | 'divider' | 'lifestyle' | 'situation' | 'review' | 'cta' | 'spec';

// ===== 섹션 =====
export interface Section {
  number: number;
  name: string;
  sectionType: SectionType;
  headline: string;
  subCopy: string;
  visualPrompt: string;
}

// ===== 고정 섹션 정의 =====
export interface FixedSection {
  number: number;
  name: string;
  sectionType: SectionType;
  label: string;
}

// ===== 생성된 이미지 =====
export interface GeneratedImage {
  data: string;
  prompt: string;
  error?: string;
}

// ===== 업로드 이미지 =====
export interface UploadedImages {
  product: string[];
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

// ===== Toast =====
export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

// ===== API 설정 =====
export interface ApiConfig {
  useBackend: boolean;
  backendUrl: string;
  geminiApiKey: string;
}

// ===== 이미지 생성 파라미터 =====
export interface GenerateImageParams {
  section: Section | FixedSection;
  index: number;
  totalSections: number;
  modelConfig: ModelConfig;
  productImage: string;
  referenceImage: string;
  useBackend: boolean;
  backendUrl: string;
  geminiApiKey: string;
  productName: string;
  productFeatures: string;
  track: GenerationTrack;
}
