/**
 * ToastHost — renders the global toast queue (see state/toastSlice.js).
 * Mounted once in App. Stacks toasts top-center; each auto-dismisses.
 */

import React from 'react';
import { useToastStore } from '../../state/toastSlice';
import GameIcon from './GameIcon';
import './Toast.css';

const TYPE_ICON_NAME = {
  success: 'success',
  error: 'warning',
  info: 'info',
  rep: 'rep'
};

export default function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (!toasts.length) return null;

  return (
    <div className="toast-host" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`app-toast app-toast-${t.type}`}
          role="status"
          onClick={() => removeToast(t.id)}
        >
          <span className="app-toast-icon">
            {t.icon ? t.icon : <GameIcon name={TYPE_ICON_NAME[t.type] || 'info'} size={18} />}
          </span>
          <span className="app-toast-message">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
