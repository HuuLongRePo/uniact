'use client';

import { useEffect, useState } from 'react';

interface RejectReasonDialogProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (reason: string) => void | Promise<void>;
  onCancel: () => void;
}

export default function RejectReasonDialog({
  isOpen,
  title = 'Tu choi hoat dong',
  message = 'Vui long nhap ly do tu choi:',
  confirmText = 'Tu choi',
  cancelText = 'Huy',
  onConfirm,
  onCancel,
}: RejectReasonDialogProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const titleId = 'admin-pending-reject-dialog-title';

  useEffect(() => {
    if (!isOpen) return;
    setReason('');
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleConfirm() {
    const trimmedReason = reason.trim();
    if (!trimmedReason) return;

    setIsSubmitting(true);
    try {
      await onConfirm(trimmedReason);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="app-modal-backdrop px-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="app-modal-panel app-modal-panel-scroll w-full max-w-md p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div>
          <h3 id={titleId} className="mb-2 text-lg font-semibold text-gray-900">
            {title}
          </h3>
          <p className="mb-3 text-gray-600">{message}</p>

          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Nhap ly do..."
            rows={4}
            className="w-full rounded-2xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
          />

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={isSubmitting || !reason.trim()}
              className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Dang xu ly...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
