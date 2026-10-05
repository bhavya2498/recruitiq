import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, subtitle, children, maxWidth = 560 }) {
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-content"
        style={{ maxWidth }}
        onClick={e => e.stopPropagation()}
      >
        <div className="card-header" style={{ borderBottom: '1px solid var(--border-light)' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{title}</h3>
            {subtitle && <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{subtitle}</p>}
          </div>
          <button
            type="button"
            className="btn-ghost"
            style={{ padding: '0.35rem', borderRadius: 'var(--r-md)', color: 'var(--text-muted)', cursor: 'pointer' }}
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>
        <div className="card-body">
          {children}
        </div>
      </div>
    </div>
  );
}
