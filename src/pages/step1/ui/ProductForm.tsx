import { useProductStore } from '@/entities/product';

export function ProductForm() {
  const { productName, productFeatures, setProductName, setProductFeatures } = useProductStore();

  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-2xl p-6 mb-6">
      <h2 className="text-lg font-bold text-text-primary mb-4">제품 정보</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            제품명 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="예: 스낵24 두부과자"
            className="w-full px-4 py-3 bg-bg-primary border border-border-subtle rounded-xl text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            제품 특징 / USP
          </label>
          <textarea
            value={productFeatures}
            onChange={(e) => setProductFeatures(e.target.value)}
            placeholder="예: 두부 5.14% 함유, 42g, 215kcal, 바삭한 식감"
            rows={3}
            className="w-full px-4 py-3 bg-bg-primary border border-border-subtle rounded-xl text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:outline-none transition-colors resize-none"
          />
        </div>
      </div>
    </div>
  );
}
