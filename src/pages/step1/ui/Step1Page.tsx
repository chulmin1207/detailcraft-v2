import { useProductStore } from '@/entities/product';
import { useImageStore } from '@/entities/image';
import { ProductForm } from './ProductForm';
import { ProductImageUpload } from './ProductImageUpload';

const ASPECT_RATIOS = ['1:1', '1:4', '1:8', '3:2', '3:4'] as const;

export function Step1Page() {
  const { productName, goToStep } = useProductStore();
  const { uploadedImages, aspectRatio, setAspectRatio } = useImageStore();

  const canContinue = productName.trim().length > 0 && uploadedImages.product.length > 0;

  return (
    <section className="max-w-3xl mx-auto">
      <ProductForm />
      <ProductImageUpload />

      {/* 화면비 선택 */}
      <div className="bg-bg-secondary border border-border-subtle rounded-2xl p-6 mt-6">
        <h3 className="text-sm font-bold text-text-primary mb-3">화면비</h3>
        <div className="flex gap-2">
          {ASPECT_RATIOS.map((ratio) => (
            <button
              key={ratio}
              type="button"
              onClick={() => setAspectRatio(ratio)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                aspectRatio === ratio
                  ? 'bg-accent-primary text-white'
                  : 'bg-bg-tertiary text-text-secondary hover:border-border-default'
              }`}
            >
              {ratio}
            </button>
          ))}
        </div>
      </div>

      <div className="text-center mt-6">
        <button
          type="button"
          onClick={() => goToStep(2)}
          disabled={!canContinue}
          className={`
            inline-flex items-center gap-3 py-4 px-12
            rounded-2xl font-bold text-lg transition-all duration-300
            ${canContinue
              ? 'bg-accent-primary text-white hover:opacity-90 shadow-lg'
              : 'bg-bg-tertiary text-text-tertiary cursor-not-allowed'
            }
          `}
        >
          다음 단계로
        </button>
        {!canContinue && (
          <p className="text-sm text-text-tertiary mt-2">
            제품명과 제품 이미지를 입력해주세요
          </p>
        )}
      </div>
    </section>
  );
}
