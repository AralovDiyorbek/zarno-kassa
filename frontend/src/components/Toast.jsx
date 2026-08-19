import React from 'react';
import { useApp } from '../context/AppContext';

export default function Toast() {
  const { toasts } = useApp();

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span>
            {t.type === 'success' && '✓ '}
            {t.type === 'error' && '✕ '}
            {t.message}
          </span>
        </div>
      ))}
    </div>
  );
}
