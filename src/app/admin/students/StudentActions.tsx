'use client';

import { User } from './types';

interface StudentActionsProps {
  showMoveModal: boolean;
  studentToMove: User | null;
  classes: { id: number; name: string }[];
  selectedClassId: number | null;
  onClassSelect: (classId: number) => void;
  onMove: () => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

export default function StudentActions({
  showMoveModal,
  studentToMove,
  classes,
  selectedClassId,
  onClassSelect,
  onMove,
  onCancel,
  loading,
}: StudentActionsProps) {
  if (!showMoveModal || !studentToMove) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Chuyển Lớp Cho Học Viên</h2>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Học viên: <strong>{studentToMove.name}</strong>
          </p>
          <p className="text-sm text-gray-600 mb-4">
            Lớp hiện tại: <strong>{studentToMove.class_name || 'Không có'}</strong>
          </p>

          <label className="block text-sm font-medium mb-2">Chuyển Đến Lớp</label>
          <select
            value={selectedClassId || ''}
            onChange={(e) => onClassSelect(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="">-- Chọn Lớp --</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            onClick={onMove}
            disabled={!selectedClassId || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Đang chuyển...' : 'Xác Nhận'}
          </button>
        </div>
      </div>
    </div>
  );
}
