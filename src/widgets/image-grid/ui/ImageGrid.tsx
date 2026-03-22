import { useProductStore } from '@/entities/product';
import { ImageCard } from './ImageCard';

interface ImageGridProps {
  onRegenerate: (index: number, options: { withOptions: boolean }) => void;
}

/**
 * 이미지 그리드 컴포넌트
 */
export function ImageGrid({ onRegenerate }: ImageGridProps) {
  const generatedSections = useProductStore((s) => s.generatedSections);

  if (!generatedSections || generatedSections.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5 max-md:grid-cols-1">
      {generatedSections.map((section, i) => (
        <ImageCard
          key={`${section.number}-${i}`}
          index={i}
          section={section}
          onRegenerate={onRegenerate}
        />
      ))}
    </div>
  );
}
