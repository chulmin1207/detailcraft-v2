import { useAuthStore } from '@/features/auth';

/**
 * 로그인 화면 컴포넌트
 * Google OAuth 로그인 버튼, 로딩 스피너, 에러 메시지를 표시한다.
 */
export function LoginScreen() {
  const { authLoading, authError, startGoogleLogin } = useAuthStore();

  return (
    <div className="fixed inset-0 bg-bg-primary flex items-center justify-center z-[10000]">
      <div className="text-center px-12 py-12 max-w-[420px] w-full">
        <div className="text-5xl mb-4">&#9889;</div>

        <h1
          className="text-[32px] font-semibold text-text-primary mb-2"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          DetailCraft Pro
        </h1>

        <p className="text-[15px] text-text-secondary mb-10">
          상세페이지 기획 + AI 이미지 생성
        </p>

        {authLoading && (
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-10 h-10 border-3 border-border-default rounded-full animate-spin"
              style={{
                borderTopColor: 'var(--accent-primary)',
                borderWidth: '3px',
              }}
            />
            <span className="text-text-secondary">로그인 확인 중...</span>
          </div>
        )}

        {!authLoading && (
          <>
            <button
              onClick={startGoogleLogin}
              disabled={authLoading}
              className="
                inline-flex items-center justify-center gap-3
                w-full px-8 py-4
                bg-bg-elevated border border-border-default rounded-[16px]
                text-text-primary text-base font-medium
                cursor-pointer
                transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]
                hover:bg-bg-hover hover:border-border-strong hover:-translate-y-0.5
                disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0
              "
              style={{ boxShadow: 'none' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google로 로그인
            </button>

            <div
              className="mt-6 px-4 py-3 rounded-[10px] text-[13px] text-text-secondary"
              style={{
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
              }}
            >
              &#x1F512; @snack24h.com 계정만 로그인 가능합니다
            </div>
          </>
        )}

        {authError && (
          <div
            className="mt-5 px-4 py-3 rounded-[10px] text-sm"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
            }}
          >
            {authError}
          </div>
        )}
      </div>
    </div>
  );
}
