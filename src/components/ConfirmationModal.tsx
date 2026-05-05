'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  icon?: React.ReactNode;
  details?: React.ReactNode;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Xac nhan',
  cancelText = 'Huy',
  confirmButtonClass = 'bg-red-600 hover:bg-red-700',
  icon,
  details,
}: ConfirmationModalProps) {
  const titleId = 'confirmation-modal-title';

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="app-modal-backdrop px-4 py-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="app-modal-panel app-modal-panel-scroll relative z-10 w-full max-w-lg overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              {icon ? (
                <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100">
                  {icon}
                </div>
              ) : null}
              <div className="min-w-0">
                <h2 id={titleId} className="text-xl font-bold text-slate-900 sm:text-2xl">
                  {title}
                </h2>
                <p className="mt-2 text-sm text-slate-600">{message}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
              aria-label="Dong hop xac nhan"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {details ? (
          <div className="max-h-[50vh] overflow-y-auto px-5 py-4 sm:px-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">{details}</div>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-3 text-sm font-semibold text-white transition ${confirmButtonClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
