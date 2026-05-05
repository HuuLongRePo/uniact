'use client';

interface StudentFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
}

export default function StudentFilters({ search, onSearchChange }: StudentFiltersProps) {
  return (
    <div className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <label className="block text-sm font-medium text-slate-700">
          Tim hoc vien
          <input
            type="text"
            aria-label="Tim hoc vien"
            placeholder="Nhap ten, email hoac ma hoc vien..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-300"
          />
        </label>
        <p className="mt-2 text-xs text-slate-500">
          Goi y: nhap tu 2 ky tu tro len de tim roster nhanh hon.
        </p>
      </div>
    </div>
  );
}
