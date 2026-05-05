'use client';

import { Search } from 'lucide-react';

interface ActivityFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  workflowFilter: string;
  onWorkflowFilterChange: (value: string) => void;
  reviewFilter: string;
  onReviewFilterChange: (value: string) => void;
}

export default function ActivityFilters({
  search,
  onSearchChange,
  workflowFilter,
  onWorkflowFilterChange,
  reviewFilter,
  onReviewFilterChange,
}: ActivityFiltersProps) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tim theo ten hoat dong, mo ta hoac giang vien..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-10 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-300"
          />
        </label>

        <select
          value={workflowFilter}
          onChange={(event) => onWorkflowFilterChange(event.target.value)}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-cyan-300"
        >
          <option value="all">Tat ca workflow</option>
          <option value="draft">Ban nhap</option>
          <option value="pending">Da gui duyet</option>
          <option value="published">Da cong bo</option>
          <option value="completed">Hoan thanh</option>
          <option value="cancelled">Da huy</option>
        </select>

        <select
          value={reviewFilter}
          onChange={(event) => onReviewFilterChange(event.target.value)}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-cyan-300"
        >
          <option value="all">Tat ca review</option>
          <option value="draft">Chua gui duyet</option>
          <option value="requested">Da gui duyet</option>
          <option value="approved">Da duyet</option>
          <option value="rejected">Bi tu choi</option>
        </select>
      </div>
    </div>
  );
}
