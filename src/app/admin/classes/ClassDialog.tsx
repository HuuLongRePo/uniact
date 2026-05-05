'use client';

import toast from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { Class, Teacher } from './types';

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
  const titleId = 'admin-class-dialog-title';

  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'edit' && initialClass) {
      setFormData({
        name: initialClass.name || '',
        grade: initialClass.grade || '',
        description: initialClass.description || '',
        teacher_id: initialClass.teacher_id ? String(initialClass.teacher_id) : '',
      });
      return;
    }

    setFormData({
      name: '',
      grade: '',
      description: '',
      teacher_id: '',
    });
  }, [initialClass, isOpen, mode]);

  if (!isOpen) return null;

  async function handleSubmit() {
    const name = formData.name.trim();
    const grade = formData.grade.trim();
    const description = formData.description.trim();

    if (!name) {
      toast.error('Vui long nhap ten lop.');
      return;
    }

    if (!grade) {
      toast.error('Vui long nhap khoi lop, vi du K66.');
      return;
    }

    await onSave({
      name,
      grade,
      description: description || undefined,
      teacher_id: formData.teacher_id ? Number(formData.teacher_id) : null,
    });
  }

  return (
    <div className="app-modal-backdrop px-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="app-modal-panel app-modal-panel-scroll w-full max-w-xl p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-2xl font-semibold text-slate-950">
              {mode === 'edit' ? 'Cap nhat lop hoc' : 'Tao lop hoc'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Khai bao ten lop, khoi va GVCN de dua vao van hanh.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Dong
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Ten lop
            <input
              type="text"
              value={formData.name}
              onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="VD: CNTT K66A"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Khoi / khoa
            <input
              type="text"
              value={formData.grade}
              onChange={(event) => setFormData((prev) => ({ ...prev, grade: event.target.value }))}
              placeholder="VD: K66"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Giang vien chu nhiem
            <select
              value={formData.teacher_id}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, teacher_id: event.target.value }))
              }
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
            >
              <option value="">Chua gan giang vien</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name} ({teacher.email})
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Mo ta
            <textarea
              value={formData.description}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="Thong tin bo sung, co the bo trong."
              rows={4}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Huy
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={loading}
            className="rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-medium text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Dang luu...' : mode === 'edit' ? 'Luu thay doi' : 'Tao lop'}
          </button>
        </div>
      </div>
    </div>
  );
}
