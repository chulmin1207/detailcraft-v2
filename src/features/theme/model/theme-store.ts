import { create } from 'zustand';
import type { ThemeMode } from '@/shared/types';
import { LS_THEME_KEY } from '@/shared/config/constants';

interface ThemeState {
  theme: ThemeMode;
  toggleTheme: () => void;
}

function getInitialTheme(): ThemeMode {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem(LS_THEME_KEY) as ThemeMode) || 'dark';
  }
  return 'dark';
}

export const useThemeStore = create<ThemeState>((set) => {
  // 초기 테마 적용
  const initialTheme = getInitialTheme();
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', initialTheme);
  }

  return {
    theme: initialTheme,

    toggleTheme: () =>
      set((state) => {
        const nextTheme: ThemeMode = state.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem(LS_THEME_KEY, nextTheme);
        document.documentElement.setAttribute('data-theme', nextTheme);
        return { theme: nextTheme };
      }),
  };
});
