'use client';

import { Class, Teacher } from './types';
import { Button } from '@/components/ui/Button';

interface AssignTeacherDialogProps {
  selectedClass: Class | null;
  teachers: Teacher[];
  selectedTeacherId: number | null;
  onTeacherSelect: (teacherId: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function AssignTeacherDialog({
  selectedClass,
  teachers,
  selectedTeacherId,
  onTeacherSelect,
  onConfirm,
  onCancel,
}: AssignTeacherDialogProps) {
  if (!selectedClass) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold mb-4">Gán GVCN cho lớp {selectedClass.name}</h3>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            GVCN hiện tại:{' '}
            {selectedClass.teacher_name || <span className="text-gray-400">Chưa có</span>}
          </p>

          <label className="block text-sm font-medium mb-2">Chọn giảng viên</label>
          <select
            value={selectedTeacherId || ''}
            onChange={(e) => onTeacherSelect(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">-- Chọn giảng viên --</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name} ({teacher.email})
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 justify-end">
          <Button onClick={onCancel} variant="secondary">
            Hủy
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!selectedTeacherId || selectedTeacherId === selectedClass.teacher_id}
            variant="primary"
          >
            Xác nhận
          </Button>
        </div>
      </div>
    </div>
  );
}
