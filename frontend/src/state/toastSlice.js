/**
 * Toast store — lightweight global notification queue.
 *
 * Any component/service can surface a transient toast without prop-drilling:
 *   import { pushToast } from '../state/toastSlice';
 *   pushToast({ type: 'success', message: 'Purchased Regen Patch' });
 *   pushToast({ type: 'rep', message: 'Concord +5 → Friendly', icon: '🤝' });
 *
 * A single <ToastHost/> (mounted once in App) renders the queue.
 */

import { create } from 'zustand';

let nextId = 1;

export const useToastStore = create((set, get) => ({
  toasts: [], // { id, type, message, icon, duration }

  pushToast: (toast) => {
    const id = nextId++;
    const entry = {
      id,
      type: toast.type || 'info', // 'success' | 'error' | 'info' | 'rep'
      message: toast.message || '',
      icon: toast.icon, // optional override; falls back to type icon
      duration: toast.duration ?? 3500
    };
    set((state) => ({ toasts: [...state.toasts, entry] }));
    if (entry.duration > 0) {
      setTimeout(() => get().removeToast(id), entry.duration);
    }
    return id;
  },

  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
}));

// Convenience for non-React callers (services, event-bus handlers).
export const pushToast = (toast) => useToastStore.getState().pushToast(toast);
