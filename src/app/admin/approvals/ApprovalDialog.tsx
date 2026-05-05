'use client';

import { useEffect, useState } from 'react';
import { ApprovalSubmission } from './types';

interface ApprovalDialogProps {
  type: 'approve' | 'reject';
  isOpen: boolean;
  activityId: number | null;
  onClose: () => void;
  onSubmit: (data: ApprovalSubmission) => Promise<void>;
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
  const titleId = 'admin-approval-dialog-title';

  useEffect(() => {
    setContent('');
  }, [activityId, isOpen, type]);

  if (!isOpen) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit({ content });
    setContent('');
  }

  const isApprove = type === 'approve';

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
              {isApprove ? 'Phe duyet hoat dong' : 'Tu choi hoat dong'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isApprove
                ? 'Bo sung ghi chu neu can truoc khi dua hoat dong vao trang thai duoc duyet.'
                : 'Nhap ly do tu choi de teacher nhin thay va sua lai hoat dong.'}
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

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            {isApprove ? 'Ghi chu noi bo (tuy chon)' : 'Ly do tu choi'}
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={
                isApprove
                  ? 'VD: Hop le, co the len lich phat hanh ngay.'
                  : 'VD: Thieu thong tin, trung lich, sai doi tuong tham gia...'
              }
              rows={5}
              required={!isApprove}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
            />
          </label>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Huy
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`rounded-2xl px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                isApprove ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-rose-700 hover:bg-rose-800'
              }`}
            >
              {loading
                ? 'Dang xu ly...'
                : isApprove
                  ? 'Xac nhan phe duyet'
                  : 'Gui tu choi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
