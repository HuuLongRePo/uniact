'use client';

import { User } from './types';
import { formatVietnamDateTime } from '@/lib/timezone';

interface StudentTableProps {
  students: User[];
  loading: boolean;
  selectedStudents: Set<number>;
  onToggleSelect: (studentId: number) => void;
  onToggleSelectAll: () => void;
  onView: (student: User) => void;
  onEdit: (student: User) => void;
  onDelete: (student: User) => void;
}

export default function StudentTable({
  students,
  loading,
  selectedStudents,
  onToggleSelect,
  onToggleSelectAll,
  onView,
  onEdit,
  onDelete,
}: StudentTableProps) {
  if (loading) {
    return <div className="text-center py-8">Đang tải...</div>;
  }

  if (students.length === 0) {
    return <div className="text-center py-8 text-gray-500">Không có học viên</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-3 py-2 text-center">
              <input
                type="checkbox"
                aria-label="Chọn tất cả học viên"
                checked={students.length > 0 && selectedStudents.size === students.length}
                onChange={onToggleSelectAll}
              />
            </th>
            <th className="border px-4 py-2 text-left">Tên</th>
            <th className="border px-4 py-2 text-left">Email</th>
            <th className="border px-4 py-2 text-left">Lớp</th>
            <th className="border px-4 py-2 text-center">Hoạt Động</th>
            <th className="border px-4 py-2 text-center">Active</th>
            <th className="border px-4 py-2 text-right">Điểm</th>
            <th className="border px-4 py-2 text-left">Ngày Tạo</th>
            <th className="border px-4 py-2 text-center">Thao Tác</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.id} className="hover:bg-gray-50 border-b">
              <td className="border px-3 py-2 text-center">
                <input
                  type="checkbox"
                  aria-label={`Chọn học viên ${student.name}`}
                  checked={selectedStudents.has(student.id)}
                  onChange={() => onToggleSelect(student.id)}
                />
              </td>
              <td className="border px-4 py-2 font-medium">{student.name}</td>
              <td className="border px-4 py-2 text-sm">{student.email}</td>
              <td className="border px-4 py-2">{student.class_name || '-'}</td>
              <td className="border px-4 py-2 text-center">{student.activity_count || 0}</td>
              <td className="border px-4 py-2 text-center">
                <span
                  className={`px-2 py-1 rounded text-xs font-semibold ${student.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                >
                  {student.is_active ? 'Có' : 'Không'}
                </span>
              </td>
              <td className="border px-4 py-2 text-right font-semibold">
                {student.total_points || 0}
              </td>
              <td className="border px-4 py-2 text-sm text-gray-600">
                {formatVietnamDateTime(student.created_at, 'date')}
              </td>
              <td className="border px-4 py-2 text-center">
                <div className="flex gap-1 justify-center flex-wrap">
                  <button
                    onClick={() => onView(student)}
                    className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                    title="Xem chi tiết"
                  >
                    Xem
                  </button>
                  <button
                    onClick={() => onEdit(student)}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    title="Chỉnh sửa"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => onDelete(student)}
                    className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                    title="Xóa"
                  >
                    Xóa
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
