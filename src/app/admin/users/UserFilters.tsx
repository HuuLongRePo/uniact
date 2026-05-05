'use client';

import { Search, UserPlus } from 'lucide-react';
import { ROLE_OPTIONS } from './roles';

interface UserFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  onCreateNew: () => void;
  hideRoleFilter?: boolean;
}

export default function UserFilters({
  search,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  onCreateNew,
  hideRoleFilter = false,
}: UserFiltersProps) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[1.2fr_0.7fr_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tim theo ten, email hoac ma nguoi dung..."
            className="w-full rounded-2xl border border-slate-200 px-10 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-300"
          />
        </label>

        {!hideRoleFilter ? (
          <select
            value={roleFilter}
            onChange={(event) => onRoleFilterChange(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-cyan-300"
          >
            <option value="">Tat ca vai tro</option>
            {ROLE_OPTIONS.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        ) : (
          <div className="hidden lg:block" />
        )}

        <button
          type="button"
          onClick={onCreateNew}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-800"
        >
          <UserPlus className="h-4 w-4" />
          Them nguoi dung
        </button>
      </div>
    </div>
  );
}
