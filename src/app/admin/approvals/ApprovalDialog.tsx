'use client';

import { useState } from 'react';

interface ApprovalDialogProps {
  type: 'approve' | 'reject';
  isOpen: boolean;
  activityId: number | null;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  loading: boolean;
}

export default function ApprovalDialog({
  type,
  isOpen,
  activityId,
  onClose,
  onSubmit,
  loading,
}: ApprovalDialogProps) {
  const [content, setContent] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ content });
    setContent('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {type === 'approve' ? 'Phê Duyệt Hoạt Động' : 'Từ Chối Hoạt Động'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={type === 'approve' ? 'Ghi chú (tùy chọn)...' : 'Lý do từ chối...'}
            className="w-full px-3 py-2 border rounded-lg"
            rows={4}
            required={type === 'reject'}
          />

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
                type === 'approve'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {loading ? 'Đang xử lý...' : type === 'approve' ? 'Phê Duyệt' : 'Từ Chối'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
