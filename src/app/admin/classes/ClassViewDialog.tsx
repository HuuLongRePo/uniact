'use client';

import { formatVietnamDateTime } from '@/lib/timezone';
import { Class } from './types';

interface ClassViewDialogProps {
  isOpen: boolean;
  cls: Class | null;
  onClose: () => void;
}

export default function ClassViewDialog({ isOpen, cls, onClose }: ClassViewDialogProps) {
  if (!isOpen || !cls) return null;

  const titleId = 'admin-class-view-dialog-title';

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
              Chi tiet lop hoc
            </h2>
            <p className="mt-1 text-sm text-slate-500">Thong tin tong quan de admin kiem tra nhanh.</p>
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
          <div className="rounded-3xl border border-slate-200 p-4">
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Ten lop</div>
            <div className="mt-2 text-lg font-semibold text-slate-950">{cls.name}</div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 p-4">
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Khoi</div>
              <div className="mt-2 text-sm text-slate-800">{cls.grade}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 p-4">
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">So hoc vien</div>
              <div className="mt-2 text-sm text-slate-800">{cls.student_count || 0}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 p-4">
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">GVCN</div>
              <div className="mt-2 text-sm text-slate-800">{cls.teacher_name || 'Chua co giang vien'}</div>
            </div>
            <div className="rounded-3xl border border-slate-200 p-4">
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Ngay tao</div>
              <div className="mt-2 text-sm text-slate-800">{formatVietnamDateTime(cls.created_at, 'date')}</div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 p-4">
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Mo ta</div>
            <div className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
              {cls.description || 'Khong co mo ta bo sung.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
