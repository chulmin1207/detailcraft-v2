// ===== 이미지 위 텍스트 오버레이 컴포넌트 =====
// AI 생성 이미지 위에 정확한 한글 headline/subCopy를 렌더링

import type { Section } from '@/shared/types';
import type { OverlayPreset } from '@/shared/config/overlay-presets';

interface Props {
  section: Section;
  preset: OverlayPreset;
}

export function TextOverlay({ section, preset }: Props) {
  const { headline, subCopy } = section;
  if (!headline && !subCopy) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: preset.layout === 'center' ? 'center' : 'flex-end',
        alignItems: preset.layout === 'center' ? 'center' : 'flex-start',
        background: preset.gradient,
        padding: preset.padding,
        pointerEvents: 'none',
        borderRadius: 'inherit',
      }}
    >
      {headline && <div style={preset.headline}>{headline}</div>}
      {subCopy && <div style={preset.subCopy}>{subCopy}</div>}
    </div>
  );
}
