'use client';

import { Class } from './types';
import { useState } from 'react';
import { formatVietnamDateTime } from '@/lib/timezone';

interface ClassTableProps {
  classes: Class[];
  loading: boolean;
  onView: (cls: Class) => void;
  onViewStudents: (classId: number) => void;
  onExport: (classId: number, className: string) => void;
  onAssignTeacher: (cls: Class) => void;
  onEdit: (cls: Class) => void;
  onDelete: (cls: Class) => void;
}

export default function ClassTable({
  classes,
  loading,
  onView,
  onViewStudents,
  onExport,
  onAssignTeacher,
  onEdit,
  onDelete,
}: ClassTableProps) {
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

  if (loading && classes.length === 0) {
    return <div className="text-center py-12 bg-gray-50 rounded-lg">Đang tải...</div>;
  }

  if (classes.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500 text-lg">Chưa có lớp học nào</p>
      </div>
    );
  }

  const totalStudents = classes.reduce((sum, cls) => sum + (cls.student_count || 0), 0);

  return (
    <div className="space-y-4">
      {loading && classes.length > 0 && (
        <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded">⏳ Đang cập nhật...</div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{classes.length}</div>
          <div className="text-sm text-gray-600">Tổng lớp học</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{totalStudents}</div>
          <div className="text-sm text-gray-600">Tổng học viên</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {classes.filter((c) => c.teacher_id).length}
          </div>
          <div className="text-sm text-gray-600">Có GVCN</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">
            {Math.round(totalStudents / classes.length) || 0}
          </div>
          <div className="text-sm text-gray-600">TB/lớp</div>
        </div>
      </div>

      {/* Table View */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lớp học
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Khối
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Giảng viên
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sĩ số
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Ngày tạo
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {classes.map((cls) => (
                <tr key={cls.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4">
                    <button onClick={() => onView(cls)} className="text-left hover:text-blue-600">
                      <div className="font-semibold text-gray-900">{cls.name}</div>
                      {cls.description && (
                        <div className="text-sm text-gray-500 line-clamp-1 max-w-xs">
                          {cls.description}
                        </div>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Khối {cls.grade}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600 hidden lg:table-cell">
                    {cls.teacher_name ? (
                      <div className="flex items-center gap-1">
                        <span>👨‍🏫</span>
                        <span>{cls.teacher_name}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Chưa có GVCN</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={() => onViewStudents(cls.id)}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold hover:bg-green-200 transition-colors"
                      title="Xem danh sách học viên"
                    >
                      👥 {cls.student_count || 0}
                    </button>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500 text-center hidden sm:table-cell">
                    {formatVietnamDateTime(cls.created_at, 'date')}
                  </td>
                  <td className="px-4 py-4 text-center relative">
                    <button
                      onClick={() => setOpenDropdown(openDropdown === cls.id ? null : cls.id)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      ⋮
                    </button>

                    {openDropdown === cls.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                        <div className="py-1">
                          <button
                            onClick={() => {
                              onView(cls);
                              setOpenDropdown(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            👁️ Xem chi tiết
                          </button>
                          <button
                            onClick={() => {
                              onViewStudents(cls.id);
                              setOpenDropdown(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            👥 Danh sách học viên
                          </button>
                          <button
                            onClick={() => {
                              onExport(cls.id, cls.name);
                              setOpenDropdown(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            📥 Xuất CSV
                          </button>
                          <button
                            onClick={() => {
                              onAssignTeacher(cls);
                              setOpenDropdown(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            👨‍🏫 Gán GVCN
                          </button>
                          <hr className="my-1" />
                          <button
                            onClick={() => {
                              onEdit(cls);
                              setOpenDropdown(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50"
                          >
                            ✏️ Sửa
                          </button>
                          <button
                            onClick={() => {
                              onDelete(cls);
                              setOpenDropdown(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                          >
                            🗑️ Xóa
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
