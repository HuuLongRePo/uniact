'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Class, Teacher } from './types';
import { Button } from '@/components/ui/Button';

interface ClassDialogProps {
  isOpen: boolean;
  mode?: 'create' | 'edit';
  initialClass?: Class | null;
  teachers: Teacher[];
  onClose: () => void;
  onSave: (classData: {
    name: string;
    grade: string;
    description?: string;
    teacher_id?: number | null;
  }) => Promise<void>;
  loading: boolean;
}

export default function ClassDialog({
  isOpen,
  mode = 'create',
  initialClass = null,
  teachers,
  onClose,
  onSave,
  loading,
}: ClassDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    description: '',
    teacher_id: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit' && initialClass) {
      setFormData({
        name: initialClass.name || '',
        grade: initialClass.grade || '',
        description: initialClass.description || '',
        teacher_id: initialClass.teacher_id ? String(initialClass.teacher_id) : '',
      });
    } else {
      setFormData({ name: '', grade: '', description: '', teacher_id: '' });
    }
  }, [isOpen, mode, initialClass]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const name = formData.name.trim();
    const grade = formData.grade.trim();
    const description = formData.description.trim();

    if (!name) {
      toast.error('Vui lòng nhập tên lớp');
      return;
    }

    if (!grade) {
      toast.error('Vui lòng nhập khối/lớp (VD: K66)');
      return;
    }

    const teacherId = formData.teacher_id ? Number(formData.teacher_id) : null;

    await onSave({
      name,
      grade,
      description: description || undefined,
      teacher_id: teacherId,
    });
  };

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
          <h3 className="text-lg font-bold">
            {mode === 'edit' ? 'Cập nhật Lớp Học' : 'Thêm Lớp Học'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Đóng">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tên lớp *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              placeholder="VD: CNTT K66"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Khối/Lớp *</label>
            <input
              type="text"
              value={formData.grade}
              onChange={(e) => setFormData((p) => ({ ...p, grade: e.target.value }))}
              placeholder="VD: K66"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Giảng viên chủ nhiệm</label>
            <select
              value={formData.teacher_id}
              onChange={(e) => setFormData((p) => ({ ...p, teacher_id: e.target.value }))}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Chọn giảng viên --</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Mô tả</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              placeholder="(Không bắt buộc)"
              rows={3}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <Button onClick={onClose} variant="secondary" disabled={loading}>
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            variant="primary"
            isLoading={loading}
            loadingText="Đang lưu..."
          >
            {mode === 'edit' ? 'Lưu thay đổi' : 'Tạo lớp'}
          </Button>
        </div>
      </div>
    </div>
  );
}
