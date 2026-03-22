// ===== MARKDOWN TO HTML CONVERTER =====

export function markdownToHtml(md: string): string {
  return md
    .replace(
      /\[SECTION_START\]/g,
      '<div style="border: 1px solid var(--border-default); border-radius: 8px; padding: 16px; margin: 12px 0; background: var(--bg-elevated);">',
    )
    .replace(/\[SECTION_END\]/g, '</div>')
    .replace(
      /^### (.*$)/gim,
      '<h3 style="color: var(--accent-tertiary); margin-top: 16px;">$1</h3>',
    )
    .replace(
      /^## (.*$)/gim,
      '<h2 style="color: var(--accent-primary-hover); margin-top: 20px;">$1</h2>',
    )
    .replace(
      /^# (.*$)/gim,
      '<h1 style="margin-top: 24px; padding-bottom: 8px; border-bottom: 1px solid var(--border-default);">$1</h1>',
    )
    .replace(
      /\*\*(.*?)\*\*/g,
      '<strong style="color: var(--text-primary);">$1</strong>',
    )
    .replace(
      /섹션번호:/g,
      '<strong style="color: var(--accent-secondary);">섹션번호:</strong>',
    )
    .replace(
      /섹션명:/g,
      '<strong style="color: var(--accent-primary-hover);">섹션명:</strong>',
    )
    .replace(/목적:/g, '<strong>목적:</strong>')
    .replace(/헤드라인:/g, '<strong>헤드라인:</strong>')
    .replace(/서브카피:/g, '<strong>서브카피:</strong>')
    .replace(
      /비주얼 지시:/g,
      '<strong style="color: var(--accent-gemini);">비주얼 지시:</strong>',
    )
    .replace(/\n/g, '<br>');
}
