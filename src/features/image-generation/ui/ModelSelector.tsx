import type { ModelType, AspectRatio } from '@/shared/types';

const ASPECT_RATIOS: Array<{ value: AspectRatio; label: string; desc: string }> = [
  { value: '1:1', label: '1:1', desc: '정사각' },
  { value: '3:4', label: '3:4', desc: '세로' },
  { value: '4:3', label: '4:3', desc: '가로' },
  { value: '9:16', label: '9:16', desc: '세로길게' },
  { value: '16:9', label: '16:9', desc: '배너' },
];

interface ModelSelectorProps {
  selectedModel: ModelType;
  onModelChange: (model: ModelType) => void;
  selectedRatio?: AspectRatio;
  onRatioChange?: (ratio: AspectRatio) => void;
  compact?: boolean;
}

/**
 * 이미지 비율 선택 컴포넌트
 */
export function ModelSelector({
  selectedRatio,
  onRatioChange,
  compact = false,
}: ModelSelectorProps) {
  if (compact || !onRatioChange) {
    return null;
  }

  return (
    <div className="bg-bg-tertiary border border-border-subtle rounded-[16px] p-5 mb-5 text-left">
      <label className="block text-[0.85rem] font-semibold mb-2 text-text-primary">
        &#x1F4D0; 이미지 비율
      </label>
      <div className="flex gap-1.5">
        {ASPECT_RATIOS.map((ratio) => (
          <label key={ratio.value} className="flex-1 cursor-pointer">
            <input
              type="radio"
              value={ratio.value}
              checked={selectedRatio === ratio.value}
              onChange={() => onRatioChange(ratio.value)}
              className="hidden peer"
            />
            <div
              className={`
                py-2 px-1 bg-bg-primary border-2 rounded-[10px] text-center
                transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]
                ${
                  selectedRatio === ratio.value
                    ? 'border-accent-gemini bg-[rgba(139,92,246,0.1)]'
                    : 'border-border-subtle hover:border-border-strong'
                }
              `}
            >
              <span className="block font-bold text-[0.8rem] text-text-primary">
                {ratio.label}
              </span>
              <span className="block text-[0.6rem] text-text-tertiary">
                {ratio.desc}
              </span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
