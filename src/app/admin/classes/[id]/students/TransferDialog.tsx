'use client';

import { Button } from '@/components/ui/Button';
import { Class } from './types';

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

  const titleId = 'admin-class-transfer-dialog-title';

  return (
    <div className="app-modal-backdrop px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="app-modal-panel app-modal-panel-scroll w-full max-w-lg p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 id={titleId} className="text-2xl font-semibold text-slate-950">
              {title}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Doi soat lai lop dich truoc khi cap nhat roster.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Dong
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
              Doi tuong duoc chuyen
            </div>
            <div className="mt-2 text-sm font-medium text-slate-900">{subjectLabel}</div>
          </div>

          <label className="block text-sm font-medium text-slate-700">
            Chon lop dich
            <select
              aria-label="Chon lop dich"
              value={targetClassId || ''}
              onChange={(event) => {
                const value = event.target.value;
                onTargetClassChange(value ? Number(value) : null);
              }}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
            >
              <option value="">Chua chon lop</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.grade || '-'})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onCancel} variant="secondary">
            Huy
          </Button>
          <Button onClick={onConfirm} disabled={!targetClassId}>
            {confirmText || 'Xac nhan chuyen'}
          </Button>
        </div>
      </div>
    </div>
  );
}
