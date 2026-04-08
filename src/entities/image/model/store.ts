import { create } from 'zustand';
import type { GeneratedImage, UploadedImages, ProductInfoJson } from '@/shared/types';

const LS_GEMINI_KEY = 'detailcraft_gemini_key';

export type Step2Phase = 'select' | 'plan' | 'config' | 'generating' | 'results';

interface ImageState {
  // API
  geminiApiKey: string;
  useBackend: boolean;
  saveGeminiKey: (key: string) => void;

  // 업로드 이미지
  uploadedImages: UploadedImages;
  setUploadedImages: (images: UploadedImages | ((prev: UploadedImages) => UploadedImages)) => void;

  // 생성된 이미지
  generatedImages: Record<number, GeneratedImage>;
  setGeneratedImages: (images: Record<number, GeneratedImage> | ((prev: Record<number, GeneratedImage>) => Record<number, GeneratedImage>)) => void;

  // 화면비
  aspectRatio: string;
  setAspectRatio: (v: string) => void;

  // 생성 진행상태
  isGenerating: boolean;
  generationProgress: number;
  setIsGenerating: (v: boolean) => void;
  setGenerationProgress: (v: number) => void;

  // Step2 phase (스텝 이동 시 유지)
  step2Phase: Step2Phase;
  setStep2Phase: (v: Step2Phase) => void;

  // 섹션별 레퍼런스 (스텝 이동 시 유지)
  sectionRefs: Record<number, string>;
  setSectionRefs: (refs: Record<number, string> | ((prev: Record<number, string>) => Record<number, string>)) => void;

  // 제품 정보 JSON (스텝 이동 시 유지)
  productInfoJson: ProductInfoJson | null;
  setProductInfoJson: (v: ProductInfoJson | null) => void;
}

export const useImageStore = create<ImageState>()(
    (set) => ({
      geminiApiKey: (() => { try { return localStorage.getItem(LS_GEMINI_KEY) || ''; } catch { return ''; } })(),
      useBackend: true,
      saveGeminiKey: (key) => {
        try { localStorage.setItem(LS_GEMINI_KEY, key); } catch {}
        set({ geminiApiKey: key });
      },

      uploadedImages: { product: [], references: [], toneReferences: [] },
      setUploadedImages: (images) =>
        set((state) => ({
          uploadedImages: typeof images === 'function' ? images(state.uploadedImages) : images,
        })),

      aspectRatio: '3:4',
      setAspectRatio: (v) => set({ aspectRatio: v }),

      generatedImages: {},
      setGeneratedImages: (images) =>
        set((state) => ({
          generatedImages: typeof images === 'function' ? images(state.generatedImages) : images,
        })),

      isGenerating: false,
      generationProgress: 0,
      setIsGenerating: (v) => set({ isGenerating: v }),
      setGenerationProgress: (v) => set({ generationProgress: v }),

      step2Phase: 'select',
      setStep2Phase: (v) => set({ step2Phase: v }),

      sectionRefs: {},
      setSectionRefs: (refs) =>
        set((state) => ({
          sectionRefs: typeof refs === 'function' ? refs(state.sectionRefs) : refs,
        })),

      productInfoJson: null,
      setProductInfoJson: (v) => set({ productInfoJson: v }),
    })
);
