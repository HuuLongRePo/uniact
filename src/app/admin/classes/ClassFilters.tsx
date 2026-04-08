'use client';

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
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <div className="flex flex-col gap-4">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Tìm kiếm theo tên lớp, khối, giảng viên..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-[200px]">
            <input
              type="text"
              placeholder="Lọc theo khối (VD: K66)"
              value={gradeFilter}
              onChange={(e) => onGradeFilterChange(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-[200px]">
            <select
              value={teacherFilter}
              onChange={(e) => {
                const v = e.target.value;
                onTeacherFilterChange(v ? Number(v) : '');
              }}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả giảng viên</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={onCreateNew}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            + Thêm Lớp Học
          </button>
        </div>
      </div>
    </div>
  );
}
