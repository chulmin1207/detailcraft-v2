import { useThemeStore } from '@/features/theme';
import { useImageStore } from '@/entities/image';

export function Header() {
  const { theme, toggleTheme } = useThemeStore();
  const { useBackend, geminiApiKey } = useImageStore();

  const geminiConnected = useBackend || !!geminiApiKey;

  return (
    <header
      className="px-8 py-5 border-b border-border-subtle sticky top-0 z-[100] flex justify-between items-center backdrop-blur-[12px]"
      style={{ background: 'var(--header-bg)' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-[10px] flex items-center justify-center text-xl"
          style={{ background: 'var(--gradient-primary)', boxShadow: 'var(--shadow-glow)' }}
        >
          ⚡
        </div>
        <span
          className="font-display text-[1.5rem] font-semibold"
          style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          DetailCraft
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          title="라이트/다크 모드 전환"
          className="p-2 bg-bg-tertiary border border-border-default rounded-[10px] text-text-primary cursor-pointer text-[1.1rem] flex items-center justify-center transition-all duration-150 hover:bg-bg-hover"
        >
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>

        <div className={`flex items-center gap-2 px-3 py-1.5 bg-bg-tertiary border rounded-full text-[0.8rem] ${geminiConnected ? 'border-accent-success' : 'border-accent-danger'}`}>
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={geminiConnected ? { background: 'var(--accent-success)', boxShadow: '0 0 8px var(--accent-success)' } : { background: 'var(--accent-danger)' }}
          />
          <span className="text-text-secondary">
            {useBackend ? 'AI 서버 연결' : geminiConnected ? 'API 연결됨' : 'API 미연결'}
          </span>
        </div>
      </div>
    </header>
  );
}
