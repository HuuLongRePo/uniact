'use client';

interface AuditFiltersProps {
  action: string;
  targetTable: string;
  actorId: string;
  dateFrom: string;
  dateTo: string;
  onActionChange: (value: string) => void;
  onTargetTableChange: (value: string) => void;
  onActorIdChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
}

export default function AuditFilters({
  action,
  targetTable,
  actorId,
  dateFrom,
  dateTo,
  onActionChange,
  onTargetTableChange,
  onActorIdChange,
  onDateFromChange,
  onDateToChange,
  onApply,
  onReset,
}: AuditFiltersProps) {
  return (
    <section className="page-surface rounded-[1.75rem] px-5 py-6 sm:px-7">
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Bo loc nhat ky</h2>
          <p className="mt-2 text-sm text-slate-600">
            Loc theo actor, action, bang du lieu va khoang thoi gian de khoanh vung su kien.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Action</span>
            <input
              type="text"
              value={action}
              onChange={(event) => onActionChange(event.target.value)}
              placeholder="CREATE, UPDATE, APPROVE..."
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Bang du lieu</span>
            <select
              value={targetTable}
              onChange={(event) => onTargetTableChange(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
            >
              <option value="">Tat ca</option>
              <option value="users">users</option>
              <option value="classes">classes</option>
              <option value="activities">activities</option>
              <option value="participations">participations</option>
              <option value="student_scores">student_scores</option>
              <option value="student_awards">student_awards</option>
              <option value="notifications">notifications</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Actor ID</span>
            <input
              type="number"
              value={actorId}
              onChange={(event) => onActorIdChange(event.target.value)}
              placeholder="Vi du: 17"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Tu ngay</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => onDateFromChange(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Den ngay</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => onDateToChange(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onReset}
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Dat lai
          </button>
          <button
            type="button"
            onClick={onApply}
            className="rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700"
          >
            Ap dung bo loc
          </button>
        </div>
      </div>
    </section>
  );
}
