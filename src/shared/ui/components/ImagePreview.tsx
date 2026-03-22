interface ImagePreviewProps {
  images?: string[];
  onRemove?: (index: number) => void;
}

/**
 * 이미지 미리보기 그리드 컴포넌트
 */
export function ImagePreview({ images = [], onRemove }: ImagePreviewProps) {
  if (images.length === 0) return null;

  return (
    <div className="flex gap-2.5 flex-wrap mt-3">
      {images.map((src, idx) => (
        <div key={idx} className="relative inline-block">
          <img
            src={src}
            alt={`\uC5C5\uB85C\uB4DC \uC774\uBBF8\uC9C0 ${idx + 1}`}
            className="w-[100px] h-[100px] object-cover rounded-lg border-2 border-accent-success"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.(idx);
            }}
            className="
              absolute -top-2 -right-2 w-6 h-6 rounded-full
              bg-accent-danger border-none text-white cursor-pointer
              text-xs flex items-center justify-center
              hover:bg-[#dc2626] transition-colors
            "
            aria-label={`\uC774\uBBF8\uC9C0 ${idx + 1} \uC0AD\uC81C`}
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
