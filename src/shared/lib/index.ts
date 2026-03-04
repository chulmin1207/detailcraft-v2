export { cn } from '@/lib/utils';

/**
 * HTML 특수 문자를 이스케이프 처리합니다.
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 지정된 밀리초만큼 대기합니다.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
