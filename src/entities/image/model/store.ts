import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  UploadedImages,
  GeneratedImage,
  AspectRatio,
  RefStrength,
  Step3Options,
  DesignBrief,
  ImageAnalysis,
  SectionDesignDirective,
  SectionReferenceFolder,
  SectionType,
} from '@/shared/types';
import { LS_ASPECT_RATIO_KEY, LS_CLAUDE_KEY, LS_GEMINI_KEY } from '@/shared/config/constants';

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

  // ===== 비율 선택 (localStorage 연동) =====
  selectedAspectRatio: AspectRatio;
  setAspectRatio: (ratio: AspectRatio) => void;

  // ===== 레퍼런스 강도 =====
  refStrength: RefStrength;
  setRefStrength: (strength: RefStrength) => void;

  // ===== 디자인 브리프 (비전 분석) =====
  designBrief: DesignBrief | null;
  setDesignBrief: (brief: DesignBrief | null) => void;
  imageAnalysis: ImageAnalysis | null;
  setImageAnalysis: (analysis: ImageAnalysis | null) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (v: boolean) => void;
  analysisError: string | null;
  setAnalysisError: (e: string | null) => void;

  // ===== 섹션별 레퍼런스 폴더 & 디자인 디렉티브 =====
  sectionRefFolders: Record<string, SectionReferenceFolder>;
  setSectionRefFolders: (
    folders: Record<string, SectionReferenceFolder> | ((prev: Record<string, SectionReferenceFolder>) => Record<string, SectionReferenceFolder>),
  ) => void;
  sectionDirectives: Record<string, SectionDesignDirective>;
  setSectionDirectives: (
    directives: Record<string, SectionDesignDirective> | ((prev: Record<string, SectionDesignDirective>) => Record<string, SectionDesignDirective>),
  ) => void;
  isAnalyzingRefs: boolean;
  setIsAnalyzingRefs: (v: boolean) => void;
  refAnalysisProgress: { current: number; total: number; currentSection: SectionType | null };
  setRefAnalysisProgress: (p: { current: number; total: number; currentSection: SectionType | null }) => void;

  // ===== 섹션별 비율 오버라이드 =====
  sectionAspectRatios: Record<number, AspectRatio>;
  setSectionAspectRatio: (index: number, ratio: AspectRatio) => void;

  // ===== Step 3 재생성 상태 =====
  step3References: Record<number, string[]>;
  setStep3References: (
    refs: Record<number, string[]> | ((prev: Record<number, string[]>) => Record<number, string[]>),
  ) => void;

  step3Prompts: Record<number, string>;
  setStep3Prompts: (
    prompts: Record<number, string> | ((prev: Record<number, string>) => Record<number, string>),
  ) => void;

  step3IncludeOptions: Record<number, Step3Options>;
  setStep3IncludeOptions: (
    options:
      | Record<number, Step3Options>
      | ((prev: Record<number, Step3Options>) => Record<number, Step3Options>),
  ) => void;
}

export const useImageStore = create<ImageState>()(
  persist(
    (set) => ({
  // ===== API 키 =====
  claudeApiKey: (() => { try { return localStorage.getItem(LS_CLAUDE_KEY) || ''; } catch { return ''; } })(),
  geminiApiKey: (() => { try { return localStorage.getItem(LS_GEMINI_KEY) || ''; } catch { return ''; } })(),
  useBackend: false,
  saveApiKeys: (claude, gemini) => {
    try {
      if (claude) localStorage.setItem(LS_CLAUDE_KEY, claude);
      if (gemini) localStorage.setItem(LS_GEMINI_KEY, gemini);
    } catch { /* localStorage unavailable */ }
    set({ claudeApiKey: claude, geminiApiKey: gemini });
  },
  clearApiKeys: () => {
    try {
      localStorage.removeItem(LS_CLAUDE_KEY);
      localStorage.removeItem(LS_GEMINI_KEY);
    } catch { /* localStorage unavailable */ }
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

  // ===== 비율 선택 (localStorage 연동) =====
  selectedAspectRatio: (() => {
    try {
      const saved = localStorage.getItem(LS_ASPECT_RATIO_KEY);
      const validRatios = ['auto','1:1','3:4','4:3','9:16','16:9','3:2','2:3','5:4','4:5','21:9','1:4','4:1','1:8','8:1'];
      return saved && validRatios.includes(saved) ? saved as AspectRatio : 'auto';
    } catch { return 'auto' as AspectRatio; }
  })(),
  setAspectRatio: (ratio) => {
    try { localStorage.setItem(LS_ASPECT_RATIO_KEY, ratio); } catch { /* localStorage unavailable */ }
    set({ selectedAspectRatio: ratio });
  },

  // ===== 레퍼런스 강도 =====
  refStrength: 'strong',
  setRefStrength: (strength) => set({ refStrength: strength }),

  // ===== 디자인 브리프 =====
  designBrief: null,
  setDesignBrief: (brief) => set({ designBrief: brief }),
  imageAnalysis: null,
  setImageAnalysis: (analysis) => set({ imageAnalysis: analysis }),
  isAnalyzing: false,
  setIsAnalyzing: (v) => set({ isAnalyzing: v }),
  analysisError: null,
  setAnalysisError: (e) => set({ analysisError: e }),

  // ===== 섹션별 레퍼런스 폴더 & 디자인 디렉티브 =====
  sectionRefFolders: {},
  setSectionRefFolders: (folders) =>
    set((state) => ({
      sectionRefFolders: typeof folders === 'function' ? folders(state.sectionRefFolders) : folders,
    })),
  sectionDirectives: {},
  setSectionDirectives: (directives) =>
    set((state) => ({
      sectionDirectives: typeof directives === 'function' ? directives(state.sectionDirectives) : directives,
    })),
  isAnalyzingRefs: false,
  setIsAnalyzingRefs: (v) => set({ isAnalyzingRefs: v }),
  refAnalysisProgress: { current: 0, total: 0, currentSection: null },
  setRefAnalysisProgress: (p) => set({ refAnalysisProgress: p }),

  // ===== 섹션별 비율 오버라이드 =====
  sectionAspectRatios: {},
  setSectionAspectRatio: (index, ratio) =>
    set((state) => ({
      sectionAspectRatios: { ...state.sectionAspectRatios, [index]: ratio },
    })),

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

  step3IncludeOptions: {},
  setStep3IncludeOptions: (options) =>
    set((state) => ({
      step3IncludeOptions: typeof options === 'function' ? options(state.step3IncludeOptions) : options,
    })),
    }),
    {
      name: 'detailcraft_image_session',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        useBackend: state.useBackend,
        selectedAspectRatio: state.selectedAspectRatio,
        refStrength: state.refStrength,
        sectionAspectRatios: state.sectionAspectRatios,
        designBrief: state.designBrief,
        imageAnalysis: state.imageAnalysis,
        sectionDirectives: state.sectionDirectives,
      }),
    }
  )
);
