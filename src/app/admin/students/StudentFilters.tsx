'use client';

interface StudentFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  classFilter: string;
  onClassFilterChange: (value: string) => void;
  includeInactive: boolean;
  onIncludeInactiveChange: (value: boolean) => void;
  classes: { id: number; name: string }[];
  onImport: () => void;
}

export default function StudentFilters({
  search,
  onSearchChange,
  classFilter,
  onClassFilterChange,
  includeInactive,
  onIncludeInactiveChange,
  classes,
  onImport,
}: StudentFiltersProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <div className="flex flex-col gap-4">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Tìm kiếm học viên..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div className="w-[200px]">
            <select
              value={classFilter}
              onChange={(e) => onClassFilterChange(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="">Tất Cả Lớp</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-gray-50">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => onIncludeInactiveChange(e.target.checked)}
            />
            <span className="text-sm">Hiện cả Inactive</span>
          </label>

          <button
            onClick={onImport}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            📥 Nhập Từ File
          </button>
        </div>
      </div>
    </div>
  );
}
