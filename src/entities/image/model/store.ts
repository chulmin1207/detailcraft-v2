import { create } from 'zustand';
import type {
  UploadedImages,
  GeneratedImage,
  ModelType,
  AspectRatio,
  RefStrength,
  Step3Options,
  DesignBrief,
} from '@/shared/types';
import { LS_MODEL_KEY, LS_ASPECT_RATIO_KEY, LS_CLAUDE_KEY, LS_GEMINI_KEY } from '@/shared/config/constants';

interface ImageState {
  // ===== API 키 =====
  claudeApiKey: string;
  geminiApiKey: string;
  useBackend: boolean;
  saveApiKeys: (claude: string, gemini: string) => void;
  clearApiKeys: () => void;

  // ===== 업로드 이미지 =====
  uploadedImages: UploadedImages;
  setUploadedImages: (images: UploadedImages | ((prev: UploadedImages) => UploadedImages)) => void;

  // ===== 섹션별 레퍼런스 =====
  sectionReferences: Record<number, string[]>;
  setSectionReferences: (
    refs: Record<number, string[]> | ((prev: Record<number, string[]>) => Record<number, string[]>),
  ) => void;

  // ===== 생성된 이미지 =====
  generatedImages: Record<number, GeneratedImage>;
  setGeneratedImages: (
    images:
      | Record<number, GeneratedImage>
      | ((prev: Record<number, GeneratedImage>) => Record<number, GeneratedImage>),
  ) => void;

  // ===== 모델 선택 (localStorage 연동) =====
  selectedModel: ModelType;
  setSelectedModel: (model: ModelType) => void;

  // ===== 비율 선택 (localStorage 연동) =====
  selectedAspectRatio: AspectRatio;
  setAspectRatio: (ratio: AspectRatio) => void;

  // ===== 레퍼런스 강도 =====
  refStrength: RefStrength;
  setRefStrength: (strength: RefStrength) => void;

  // ===== 디자인 브리프 (비전 분석) =====
  designBrief: DesignBrief | null;
  setDesignBrief: (brief: DesignBrief | null) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (v: boolean) => void;
  analysisError: string | null;
  setAnalysisError: (e: string | null) => void;

  // ===== Step 3 재생성 상태 =====
  step3References: Record<number, string[]>;
  setStep3References: (
    refs: Record<number, string[]> | ((prev: Record<number, string[]>) => Record<number, string[]>),
  ) => void;

  step3Prompts: Record<number, string>;
  setStep3Prompts: (
    prompts: Record<number, string> | ((prev: Record<number, string>) => Record<number, string>),
  ) => void;

  step3Models: Record<number, ModelType>;
  setStep3Models: (
    models:
      | Record<number, ModelType>
      | ((prev: Record<number, ModelType>) => Record<number, ModelType>),
  ) => void;

  step3IncludeOptions: Record<number, Step3Options>;
  setStep3IncludeOptions: (
    options:
      | Record<number, Step3Options>
      | ((prev: Record<number, Step3Options>) => Record<number, Step3Options>),
  ) => void;
}

export const useImageStore = create<ImageState>((set) => ({
  // ===== API 키 =====
  claudeApiKey: localStorage.getItem(LS_CLAUDE_KEY) || '',
  geminiApiKey: localStorage.getItem(LS_GEMINI_KEY) || '',
  useBackend: true,
  saveApiKeys: (claude, gemini) => {
    if (claude) localStorage.setItem(LS_CLAUDE_KEY, claude);
    if (gemini) localStorage.setItem(LS_GEMINI_KEY, gemini);
    set({ claudeApiKey: claude, geminiApiKey: gemini });
  },
  clearApiKeys: () => {
    localStorage.removeItem(LS_CLAUDE_KEY);
    localStorage.removeItem(LS_GEMINI_KEY);
    set({ claudeApiKey: '', geminiApiKey: '' });
  },

  // ===== 업로드 이미지 =====
  uploadedImages: { product: [], package: [], references: [] },
  setUploadedImages: (images) =>
    set((state) => ({
      uploadedImages: typeof images === 'function' ? images(state.uploadedImages) : images,
    })),

  // ===== 섹션별 레퍼런스 =====
  sectionReferences: {},
  setSectionReferences: (refs) =>
    set((state) => ({
      sectionReferences: typeof refs === 'function' ? refs(state.sectionReferences) : refs,
    })),

  // ===== 생성된 이미지 =====
  generatedImages: {},
  setGeneratedImages: (images) =>
    set((state) => ({
      generatedImages: typeof images === 'function' ? images(state.generatedImages) : images,
    })),

  // ===== 모델 선택 (localStorage 연동) =====
  selectedModel: (localStorage.getItem(LS_MODEL_KEY) as ModelType) || 'fast',
  setSelectedModel: (model) => {
    localStorage.setItem(LS_MODEL_KEY, model);
    set({ selectedModel: model });
  },

  // ===== 비율 선택 (localStorage 연동) =====
  selectedAspectRatio: (localStorage.getItem(LS_ASPECT_RATIO_KEY) as AspectRatio) || '3:4',
  setAspectRatio: (ratio) => {
    localStorage.setItem(LS_ASPECT_RATIO_KEY, ratio);
    set({ selectedAspectRatio: ratio });
  },

  // ===== 레퍼런스 강도 =====
  refStrength: 'strong',
  setRefStrength: (strength) => set({ refStrength: strength }),

  // ===== 디자인 브리프 =====
  designBrief: null,
  setDesignBrief: (brief) => set({ designBrief: brief }),
  isAnalyzing: false,
  setIsAnalyzing: (v) => set({ isAnalyzing: v }),
  analysisError: null,
  setAnalysisError: (e) => set({ analysisError: e }),

  // ===== Step 3 재생성 상태 =====
  step3References: {},
  setStep3References: (refs) =>
    set((state) => ({
      step3References: typeof refs === 'function' ? refs(state.step3References) : refs,
    })),

  step3Prompts: {},
  setStep3Prompts: (prompts) =>
    set((state) => ({
      step3Prompts: typeof prompts === 'function' ? prompts(state.step3Prompts) : prompts,
    })),

  step3Models: {},
  setStep3Models: (models) =>
    set((state) => ({
      step3Models: typeof models === 'function' ? models(state.step3Models) : models,
    })),

  step3IncludeOptions: {},
  setStep3IncludeOptions: (options) =>
    set((state) => ({
      step3IncludeOptions: typeof options === 'function' ? options(state.step3IncludeOptions) : options,
    })),
}));
