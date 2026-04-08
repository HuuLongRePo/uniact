'use client';

interface StudentFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
}

export default function StudentFilters({ search, onSearchChange }: StudentFiltersProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tìm kiếm</label>
          <input
            type="text"
            placeholder="Nhập tên / email / mã sinh viên..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-4 py-2 border rounded"
          />
          <div className="text-xs text-gray-500 mt-1">Gợi ý: nhập từ 2 ký tự để tìm</div>
        </div>
      </div>
    </div>
  );
}
