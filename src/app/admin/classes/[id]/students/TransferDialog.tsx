'use client';

import { Class } from './types';
import { Button } from '@/components/ui/Button';

interface TransferDialogProps {
  isOpen: boolean;
  title: string;
  subjectLabel: string;
  classes: Class[];
  targetClassId: number | null;
  onTargetClassChange: (id: number | null) => void;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
}

export default function TransferDialog({
  isOpen,
  title,
  subjectLabel,
  classes,
  targetClassId,
  onTargetClassChange,
  onConfirm,
  onCancel,
  confirmText,
}: TransferDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-bold mb-4">{title}</h3>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-4">
            Đối tượng: <strong>{subjectLabel}</strong>
          </p>

          <label className="block text-sm font-medium mb-2">Chọn lớp đích</label>
          <select
            value={targetClassId || ''}
            onChange={(e) => {
              const v = e.target.value;
              onTargetClassChange(v ? Number(v) : null);
            }}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="">-- Chọn lớp --</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 justify-end">
          <Button onClick={onCancel} variant="secondary">
            Hủy
          </Button>
          <Button onClick={onConfirm} disabled={!targetClassId} variant="primary">
            {confirmText || 'Xác nhận chuyển'}
          </Button>
        </div>
      </div>
    </div>
  );
}
