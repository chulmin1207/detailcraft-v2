import { create } from 'zustand';
import type { User } from '@/shared/types';
import { BACKEND_URL, AUTH_TOKEN_KEY, AUTH_USER_KEY } from '@/shared/config/constants';

interface AuthStore {
  currentUser: User | null;
  authLoading: boolean;
  authError: string | null;
  startGoogleLogin: () => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  currentUser: null,
  authLoading: true,
  authError: null,

  startGoogleLogin: () => {
    window.location.href = `${BACKEND_URL}/api/auth/login`;
  },

  logout: () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    set({ currentUser: null, authError: null });
  },

  checkAuth: async () => {
    set({ authLoading: true, authError: null });

    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    const errorFromUrl = urlParams.get('error');

    if (tokenFromUrl || errorFromUrl) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (errorFromUrl) {
      const errorMessages: Record<string, string> = {
        auth_denied: '로그인이 취소되었습니다.',
        invalid_domain: 'snack24h.com 계정으로만 로그인 가능합니다.',
        token_exchange_failed: '인증 처리 중 오류가 발생했습니다.',
        user_info_failed: '사용자 정보를 가져올 수 없습니다.',
        server_error: '서버 오류가 발생했습니다. 다시 시도해주세요.',
      };
      set({
        authError: errorMessages[errorFromUrl] || '알 수 없는 오류가 발생했습니다.',
        authLoading: false,
      });
      return;
    }

    if (tokenFromUrl) {
      localStorage.setItem(AUTH_TOKEN_KEY, tokenFromUrl);
    }

    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    if (!token) {
      set({ authLoading: false });
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.valid) {
        set({ currentUser: data.user, authLoading: false });
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
      } else {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
        set({
          authError:
            data.error === 'Token expired'
              ? '세션이 만료되었습니다. 다시 로그인해주세요.'
              : '인증에 실패했습니다. 다시 로그인해주세요.',
          authLoading: false,
        });
      }
    } catch (error) {
      console.error('Auth verification error:', error);
      const savedUser = localStorage.getItem(AUTH_USER_KEY);
      if (savedUser) {
        set({ currentUser: JSON.parse(savedUser), authLoading: false });
      } else {
        set({
          authError: '서버에 연결할 수 없습니다. 다시 시도해주세요.',
          authLoading: false,
        });
      }
    }
  },
}));
