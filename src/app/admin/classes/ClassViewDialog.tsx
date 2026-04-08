'use client';

import { Class } from './types';
import { Button } from '@/components/ui/Button';

interface ClassViewDialogProps {
  isOpen: boolean;
  cls: Class | null;
  onClose: () => void;
}

export default function ClassViewDialog({ isOpen, cls, onClose }: ClassViewDialogProps) {
  if (!isOpen || !cls) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 max-w-lg w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Chi tiết lớp học</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Đóng">
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-xs text-gray-500">Tên lớp</div>
            <div className="text-base font-semibold text-gray-900">{cls.name}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500">Khối/Lớp</div>
              <div className="text-sm text-gray-900">{cls.grade}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Số học viên</div>
              <div className="text-sm text-gray-900">{cls.student_count || 0}</div>
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Giảng viên chủ nhiệm</div>
            <div className="text-sm text-gray-900">{cls.teacher_name || 'Chưa có giảng viên'}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Ngày tạo</div>
            <div className="text-sm text-gray-900">
              {new Date(cls.created_at).toLocaleDateString('vi-VN')}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Mô tả</div>
            <div className="text-sm text-gray-900 whitespace-pre-wrap">
              {cls.description || '(Không có)'}
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button onClick={onClose} variant="secondary">
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}
