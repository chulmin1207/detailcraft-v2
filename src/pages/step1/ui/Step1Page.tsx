import { useProductStore } from '@/entities/product';
import { useImageStore } from '@/entities/image';
import { ProductForm } from './ProductForm';
import { ProductImageUpload } from './ProductImageUpload';

export function Step1Page() {
  const { productName, goToStep } = useProductStore();
  const { uploadedImages } = useImageStore();

  const canContinue = productName.trim().length > 0 && uploadedImages.product.length > 0;

  return (
    <section className="max-w-3xl mx-auto">
      <ProductForm />
      <ProductImageUpload />

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
