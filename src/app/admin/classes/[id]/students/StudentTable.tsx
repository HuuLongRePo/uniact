'use client';

import { Student } from './types';

interface StudentTableProps {
  students: Student[];
  loading: boolean;
  page?: number;
  pageSize?: number;
  selectedStudents: Set<number>;
  onToggleSelectAll: () => void;
  onToggleSelectStudent: (studentId: number) => void;
  onView: (student: Student) => void;
  onMove: (student: Student) => void;
  onRemove: (student: Student) => void;
}

export default function StudentTable({
  students,
  loading,
  page = 1,
  pageSize = students.length || 1,
  selectedStudents,
  onToggleSelectAll,
  onToggleSelectStudent,
  onView,
  onMove,
  onRemove,
}: StudentTableProps) {
  const isEmpty = students.length === 0;
  const allSelected = students.length > 0 && selectedStudents.size === students.length;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-gray-600">Đang tải danh sách học viên...</div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500 text-lg">Không có học viên</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              <input type="checkbox" checked={allSelected} onChange={onToggleSelectAll} />
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Học viên
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              Hoạt động
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              Điểm
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Hành động
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {students.map((student, index) => (
            <tr key={student.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm">
                <input
                  type="checkbox"
                  checked={selectedStudents.has(student.id)}
                  onChange={() => onToggleSelectStudent(student.id)}
                />
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {(page - 1) * pageSize + index + 1}
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  {student.avatar_url ? (
                    <img
                      src={student.avatar_url}
                      alt={student.name}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-600 font-bold">
                        {student.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="font-medium">{student.name}</div>
                    <div className="text-sm text-gray-500">{student.email}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-center text-sm">{student.activity_count || 0}</td>
              <td className="px-6 py-4 text-center">
                <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-bold">
                  {student.total_points || 0}
                </span>
              </td>
              <td className="px-6 py-4 text-right text-sm space-x-2">
                <button
                  onClick={() => onView(student)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Xem
                </button>
                <button
                  onClick={() => onMove(student)}
                  className="text-purple-600 hover:text-purple-800"
                  title="Chuyển lớp"
                >
                  Chuyển
                </button>
                <button
                  onClick={() => onRemove(student)}
                  className="text-red-600 hover:text-red-800"
                >
                  Xóa khỏi lớp
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
