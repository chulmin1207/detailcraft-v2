import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Category, PriceRange, Section, GeneratedImage } from '@/shared/types';

interface ProductState {
  // ===== 폼 입력 =====
  productName: string;
  category: Category | '';
  priceRange: PriceRange;
  targetAudience: string;
  productFeatures: string;
  additionalNotes: string;

  // ===== 위저드 스텝 =====
  currentStep: number;

  // ===== 기획서 / 섹션 =====
  generatedPlan: string;
  generatedSections: Section[];

  // ===== 폼 액션 =====
  setProductName: (name: string) => void;
  setCategory: (category: Category | '') => void;
  setPriceRange: (range: PriceRange) => void;
  setTargetAudience: (audience: string) => void;
  setProductFeatures: (features: string) => void;
  setAdditionalNotes: (notes: string) => void;

  // ===== 스텝 액션 =====
  goToStep: (step: number) => void;
  canNavigateToStep: (step: number, generatedImages?: Record<number, GeneratedImage>) => boolean;

  // ===== 기획서 액션 =====
  setGeneratedPlan: (plan: string) => void;
  setGeneratedSections: (sections: Section[] | ((prev: Section[]) => Section[])) => void;
}

export const useProductStore = create<ProductState>()(
  persist(
    (set, get) => ({
      // ===== 폼 입력 초기값 =====
      productName: '',
      category: '',
      priceRange: '',
      targetAudience: '',
      productFeatures: '',
      additionalNotes: '',

      // ===== 위저드 스텝 =====
      currentStep: 1,

      // ===== 기획서 / 섹션 =====
      generatedPlan: '',
      generatedSections: [],

      // ===== 폼 액션 =====
      setProductName: (name) => set({ productName: name }),
      setCategory: (category) => set({ category }),
      setPriceRange: (range) => set({ priceRange: range }),
      setTargetAudience: (audience) => set({ targetAudience: audience }),
      setProductFeatures: (features) => set({ productFeatures: features }),
      setAdditionalNotes: (notes) => set({ additionalNotes: notes }),

      // ===== 스텝 액션 =====
      goToStep: (step) => {
        if (step < 1 || step > 3) return;
        set({ currentStep: step });
      },

      canNavigateToStep: (step, generatedImages) => {
        if (step === 1) return true;
        if (step === 2) return get().generatedSections.length > 0;
        if (step === 3) {
          if (!generatedImages) return false;
          return Object.values(generatedImages).some((img) => img && !img.error);
        }
        return false;
      },

      // ===== 기획서 액션 =====
      setGeneratedPlan: (plan) => set({ generatedPlan: plan }),
      setGeneratedSections: (sections) =>
        set((state) => ({
          generatedSections: typeof sections === 'function' ? sections(state.generatedSections) : sections,
        })),
    }),
    {
      name: 'detailcraft_product_session',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        productName: state.productName,
        category: state.category,
        priceRange: state.priceRange,
        targetAudience: state.targetAudience,
        productFeatures: state.productFeatures,
        additionalNotes: state.additionalNotes,
        generatedPlan: state.generatedPlan,
        generatedSections: state.generatedSections,
        currentStep: state.currentStep,
      }),
    }
  )
);
