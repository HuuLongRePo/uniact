'use client';

import { Plus, Search } from 'lucide-react';
import { Teacher } from './types';

interface ClassFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  gradeFilter: string;
  onGradeFilterChange: (value: string) => void;
  teacherFilter: number | '';
  onTeacherFilterChange: (value: number | '') => void;
  teachers: Teacher[];
  onCreateNew: () => void;
}

export default function ClassFilters({
  search,
  onSearchChange,
  gradeFilter,
  onGradeFilterChange,
  teacherFilter,
  onTeacherFilterChange,
  teachers,
  onCreateNew,
}: ClassFiltersProps) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[1.1fr_0.6fr_0.7fr_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tim theo ten lop, khoi hoac giang vien..."
            className="w-full rounded-2xl border border-slate-200 px-10 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-300"
          />
        </label>

        <input
          type="text"
          value={gradeFilter}
          onChange={(event) => onGradeFilterChange(event.target.value)}
          placeholder="Loc theo khoi, VD K66"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-300"
        />

        <select
          value={teacherFilter}
          onChange={(event) => onTeacherFilterChange(event.target.value ? Number(event.target.value) : '')}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-cyan-300"
        >
          <option value="">Tat ca giang vien</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onCreateNew}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-800"
        >
          <Plus className="h-4 w-4" />
          Them lop
        </button>
      </div>
    </div>
  );
}
