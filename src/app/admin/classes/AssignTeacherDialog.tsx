'use client';

import { Class, Teacher } from './types';

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

  const titleId = 'admin-assign-teacher-dialog-title';

  return (
    <div className="app-modal-backdrop px-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="app-modal-panel app-modal-panel-scroll w-full max-w-lg p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-2xl font-semibold text-slate-950">
          Gan GVCN cho lop {selectedClass.name}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          GVCN hien tai: <span className="font-medium text-slate-700">{selectedClass.teacher_name || 'Chua co'}</span>
        </p>

        <label className="mt-6 block text-sm font-medium text-slate-700">
          Chon giang vien
          <select
            value={selectedTeacherId || ''}
            onChange={(event) => onTeacherSelect(Number(event.target.value))}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
          >
            <option value="">Chon giang vien</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name} ({teacher.email})
              </option>
            ))}
          </select>
        </label>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Huy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!selectedTeacherId || selectedTeacherId === selectedClass.teacher_id}
            className="rounded-2xl bg-cyan-700 px-4 py-3 text-sm font-medium text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Xac nhan gan
          </button>
        </div>
      </div>
    </div>
  );
}
