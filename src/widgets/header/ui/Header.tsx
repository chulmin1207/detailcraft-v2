import { useAuthStore } from '@/features/auth';
import { useThemeStore } from '@/features/theme';
import { useImageStore } from '@/entities/image';

interface HeaderProps {
  onOpenApiSettings: () => void;
}

/**
 * 헤더 컴포넌트
 * 좌측: 로고 마크 + 타이틀 + 버전 뱃지
 * 우측: 유저 정보 + 로그아웃, 테마 토글, Claude/Gemini API 상태 점, API 설정 버튼
 */
export function Header({ onOpenApiSettings }: HeaderProps) {
  const { currentUser, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { claudeApiKey, geminiApiKey, useBackend } = useImageStore();

  const claudeConnected = useBackend || !!claudeApiKey;
  const geminiConnected = useBackend || !!geminiApiKey;
  const claudeLabel = useBackend
    ? '기획 AI (서버)'
    : claudeConnected
      ? '기획 AI 연결됨'
      : '기획 AI 미연결';
  const geminiLabel = useBackend
    ? '이미지 AI (서버)'
    : geminiConnected
      ? '이미지 AI 연결됨'
      : '이미지 AI 미연결';

  return (
    <header
      className="
        px-8 py-5 border-b border-border-subtle
        sticky top-0 z-[100]
        flex justify-between items-center
        backdrop-blur-[12px]
      "
      style={{ background: 'var(--header-bg)' }}
    >
      {/* 로고 */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-[10px] flex items-center justify-center text-xl"
          style={{
            background: 'var(--gradient-primary)',
            boxShadow: 'var(--shadow-glow)',
          }}
        >
          <span role="img" aria-label="logo">
            &#9889;
          </span>
        </div>
        <span
          className="font-display text-[1.5rem] font-semibold"
          style={{
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          DetailCraft Pro
        </span>
        <span
          className="text-[0.7rem] px-2 py-0.5 rounded-full text-white ml-2"
          style={{ background: 'var(--gradient-gemini)' }}
        >
          + AI Image
        </span>
      </div>

      {/* API 섹션 (우측) */}
      <div className="flex items-center gap-3 flex-wrap">
        {currentUser && (
          <div className="flex items-center gap-3">
            {currentUser.picture && (
              <img
                className="w-8 h-8 rounded-full border-2 border-border-default"
                src={currentUser.picture}
                alt={currentUser.name || ''}
              />
            )}
            <span className="text-sm text-text-secondary">
              {currentUser.name || currentUser.email}
            </span>
            <button
              onClick={logout}
              className="
                px-3 py-1.5 bg-transparent
                border border-border-default rounded-[6px]
                text-text-secondary text-xs cursor-pointer
                transition-all duration-150
                hover:bg-bg-hover hover:text-text-primary
              "
            >
              로그아웃
            </button>
          </div>
        )}

        <button
          onClick={toggleTheme}
          title="라이트/다크 모드 전환"
          className="
            p-2 bg-bg-tertiary border border-border-default rounded-[10px]
            text-text-primary cursor-pointer text-[1.1rem]
            flex items-center justify-center
            transition-all duration-150
            hover:bg-bg-hover hover:border-border-strong
          "
        >
          {theme === 'dark' ? '\uD83C\uDF19' : '\u2600\uFE0F'}
        </button>

        <div
          className={`
            flex items-center gap-2 px-3 py-1.5
            bg-bg-tertiary border rounded-full text-[0.8rem]
            ${claudeConnected ? 'border-accent-success' : 'border-accent-danger'}
          `}
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={
              claudeConnected
                ? {
                    background: 'var(--accent-success)',
                    boxShadow: '0 0 8px var(--accent-success)',
                  }
                : { background: 'var(--accent-danger)' }
            }
          />
          <span className="text-text-secondary">{claudeLabel}</span>
        </div>

        <div
          className={`
            flex items-center gap-2 px-3 py-1.5
            bg-bg-tertiary border rounded-full text-[0.8rem]
            ${geminiConnected ? 'border-accent-success' : 'border-accent-danger'}
          `}
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={
              geminiConnected
                ? {
                    background: 'var(--accent-success)',
                    boxShadow: '0 0 8px var(--accent-success)',
                  }
                : { background: 'var(--accent-danger)' }
            }
          />
          <span className="text-text-secondary">{geminiLabel}</span>
        </div>

        {!useBackend && (
          <button
            onClick={onOpenApiSettings}
            className="
              px-3 py-1.5 bg-bg-elevated
              border border-border-default rounded-[10px]
              text-text-primary font-sans text-[0.8rem]
              cursor-pointer transition-all duration-150
              hover:bg-bg-hover hover:border-border-strong
            "
          >
            &#9881;&#65039; API 설정
          </button>
        )}
      </div>
    </header>
  );
}
