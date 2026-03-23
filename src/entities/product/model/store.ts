import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Section, GenerationTrack } from '@/shared/types';

interface ProductState {
  // 제품 정보
  productName: string;
  productFeatures: string;
  setProductName: (name: string) => void;
  setProductFeatures: (features: string) => void;

  // 생성 트랙
  selectedTrack: GenerationTrack | null;
  setSelectedTrack: (track: GenerationTrack | null) => void;

  // 스텝 네비게이션
  currentStep: number;
  goToStep: (step: number) => void;

  // Claude 기획 결과 (Track 1 전용)
  generatedSections: Section[];
  setGeneratedSections: (sections: Section[]) => void;
}

export const useProductStore = create<ProductState>()(
  persist(
    (set) => ({
      productName: '',
      productFeatures: '',
      setProductName: (name) => set({ productName: name }),
      setProductFeatures: (features) => set({ productFeatures: features }),

      selectedTrack: null,
      setSelectedTrack: (track) => set({ selectedTrack: track }),

      currentStep: 1,
      goToStep: (step) => {
        if (step >= 1 && step <= 2) set({ currentStep: step });
      },

      generatedSections: [],
      setGeneratedSections: (sections) => set({ generatedSections: sections }),
    }),
    {
      name: 'detailcraft_product_session',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
