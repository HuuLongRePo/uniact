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
  title = 'Từ chối hoạt động',
  message = 'Vui lòng nhập lý do từ chối:',
  confirmText = 'Từ chối',
  cancelText = 'Hủy',
  onConfirm,
  onCancel,
}: RejectReasonDialogProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setReason('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    const trimmed = reason.trim();
    if (!trimmed) return;
    setIsSubmitting(true);
    try {
      await onConfirm(trimmed);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-3">{message}</p>

          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Nhập lý do..."
            rows={4}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
          />

          <div className="flex gap-3 justify-end mt-5">
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting || !reason.trim()}
              className="px-4 py-2 text-white rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Đang xử lý...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
