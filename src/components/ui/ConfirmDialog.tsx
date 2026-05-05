'use client';

import { useId, useState } from 'react';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  onConfirm,
  onCancel,
  variant = 'warning',
}: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const titleId = useId();

  if (!isOpen) return null;

  async function handleConfirm() {
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
    }
  }

  const confirmVariant =
    variant === 'danger' ? 'danger' : variant === 'info' ? 'primary' : 'warning';

  return (
    <div className="app-modal-backdrop px-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="app-modal-panel w-full max-w-md"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-6">
          <h3 id={titleId} className="mb-2 text-lg font-semibold text-gray-900">
            {title}
          </h3>
          <p className="mb-6 text-gray-600">{message}</p>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onCancel} isLoading={false} disabled={isLoading}>
              {cancelText}
            </Button>
            <Button
              variant={confirmVariant}
              onClick={handleConfirm}
              isLoading={isLoading}
              loadingText="Đang xử lý..."
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
