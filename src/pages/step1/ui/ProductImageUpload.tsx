import { useCallback } from 'react';
import { useImageStore } from '@/entities/image';

export function ProductImageUpload() {
  const { uploadedImages, setUploadedImages } = useImageStore();

  const handleFileSelect = useCallback((type: 'product' | 'references') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = type === 'references';
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          setUploadedImages((prev) => ({
            ...prev,
            [type]: type === 'product' ? [dataUrl] : [...prev[type], dataUrl].slice(0, 5),
          }));
        };
        reader.readAsDataURL(file);
      });
    };
    input.click();
  }, [setUploadedImages]);

  const handleRemove = useCallback((type: 'product' | 'references', index: number) => {
    setUploadedImages((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index),
    }));
  }, [setUploadedImages]);

  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-2xl p-6 mb-6">
      <h2 className="text-lg font-bold text-text-primary mb-4">이미지 업로드</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 제품 이미지 */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            제품 이미지 <span className="text-red-400">*</span>
          </label>
          <div
            onClick={() => uploadedImages.product.length === 0 && handleFileSelect('product')}
            className="border-2 border-dashed border-border-subtle rounded-xl p-4 min-h-[200px] flex items-center justify-center cursor-pointer hover:border-accent-primary transition-colors"
          >
            {uploadedImages.product.length > 0 ? (
              <div className="relative w-full">
                <img
                  src={uploadedImages.product[0]}
                  alt="제품"
                  className="w-full h-48 object-contain rounded-lg"
                />
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemove('product', 0); }}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="text-center text-text-tertiary">
                <div className="text-3xl mb-2">📦</div>
                <div className="text-sm">제품/패키지 이미지를 업로드하세요</div>
              </div>
            )}
          </div>
        </div>

        {/* 레퍼런스 이미지 */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            톤앤매너 레퍼런스 (최대 5장)
          </label>
          <div
            onClick={() => handleFileSelect('references')}
            className="border-2 border-dashed border-border-subtle rounded-xl p-4 min-h-[200px] cursor-pointer hover:border-accent-primary transition-colors"
          >
            {uploadedImages.references.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {uploadedImages.references.map((img, i) => (
                  <div key={i} className="relative">
                    <img src={img} alt={`ref-${i}`} className="w-full h-24 object-cover rounded-lg" />
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemove('references', i); }}
                      className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center hover:bg-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {uploadedImages.references.length < 5 && (
                  <div className="w-full h-24 border border-dashed border-border-subtle rounded-lg flex items-center justify-center text-text-tertiary text-xl">
                    +
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-text-tertiary h-full flex flex-col items-center justify-center">
                <div className="text-3xl mb-2">🎨</div>
                <div className="text-sm">참고할 디자인 이미지를 업로드하세요</div>
                <div className="text-xs mt-1">톤, 색감, 스타일 참고용</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
