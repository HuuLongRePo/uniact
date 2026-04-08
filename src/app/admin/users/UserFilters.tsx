'use client';

import { ROLE_OPTIONS } from './roles';

interface UserFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  onCreateNew: () => void;
  hideRoleFilter?: boolean; // Optional: hide role dropdown when tabs are used
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
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <div className="flex flex-col gap-4">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, email..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          {!hideRoleFilter && (
            <div className="w-[200px]">
              <select
                value={roleFilter}
                onChange={(e) => onRoleFilterChange(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">Tất Cả Vai Trò</option>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={onCreateNew}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            + Thêm Người Dùng
          </button>
        </div>
      </div>
    </div>
  );
}
