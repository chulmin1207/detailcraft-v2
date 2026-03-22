import { create } from 'zustand';
import type { Toast, ToastType } from '@/shared/types';

interface ToastStore {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType) => number;
  removeToast: (id: number) => void;
}

let toastIdCounter = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  showToast: (message, type = 'success') => {
    const id = ++toastIdCounter;

    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));

    // Auto-remove with type-specific delay
    const delay = type === 'error' ? 6000 : 4000;
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, delay);

    return id;
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
