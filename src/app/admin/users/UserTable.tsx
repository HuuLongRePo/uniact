'use client';

import { User } from './types';
import { getRoleBadgeClass, getRoleLabel } from './roles';
import { formatVietnamDateTime } from '@/lib/timezone';

interface UserTableProps {
  users: User[];
  loading: boolean;
  selectedUsers: Set<number>;
  onToggleSelect: (userId: number) => void;
  onToggleSelectAll: () => void;
  onView: (user: User) => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}

export default function UserTable({
  users,
  loading,
  selectedUsers,
  onToggleSelect,
  onToggleSelectAll,
  onView,
  onEdit,
  onDelete,
}: UserTableProps) {
  if (loading && users.length === 0) {
    return <div className="text-center py-8">Đang tải...</div>;
  }

  if (users.length === 0) {
    return <div className="text-center py-8 text-gray-500">Không có dữ liệu</div>;
  }

  return (
    <div className="overflow-x-auto">
      {loading && users.length > 0 && (
        <div className="px-4 py-2 text-sm text-gray-600">Đang cập nhật danh sách...</div>
      )}
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-4 py-2 text-center w-12">
              <input
                type="checkbox"
                checked={selectedUsers.size === users.length && users.length > 0}
                onChange={onToggleSelectAll}
                className="w-4 h-4 cursor-pointer"
              />
            </th>
            <th className="border px-4 py-2 text-left">Họ và tên</th>
            <th className="border px-4 py-2 text-left">Email</th>
            <th className="border px-4 py-2 text-left">Vai Trò</th>
            <th className="border px-4 py-2 text-left">Lớp</th>
            <th className="border px-4 py-2 text-left">Ngày Tạo</th>
            <th className="border px-4 py-2 text-center">Thao Tác</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50 border-b">
              <td className="border px-4 py-2 text-center">
                <input
                  type="checkbox"
                  checked={selectedUsers.has(user.id)}
                  onChange={() => onToggleSelect(user.id)}
                  className="w-4 h-4 cursor-pointer"
                />
              </td>
              <td className="border px-4 py-2 font-medium">{user.full_name || user.username}</td>
              <td className="border px-4 py-2 text-sm">{user.email}</td>
              <td className="border px-4 py-2">
                <span
                  className={`px-2 py-1 rounded text-sm font-medium ${getRoleBadgeClass(user.role)}`}
                >
                  {getRoleLabel(user.role)}
                </span>
              </td>
              <td className="border px-4 py-2 text-sm">
                {user.role === 'teacher' ? user.teaching_class_name || '-' : user.class_name || '-'}
              </td>
              <td className="border px-4 py-2 text-sm text-gray-600">
                {formatVietnamDateTime(user.created_at, 'date')}
              </td>
              <td className="border px-4 py-2 text-center">
                <div className="flex gap-1 justify-center flex-wrap">
                  <button
                    onClick={() => onView(user)}
                    className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                    title="Xem chi tiết"
                  >
                    👁️ Xem
                  </button>
                  <button
                    onClick={() => onEdit(user)}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    title="Chỉnh sửa"
                  >
                    ✏️ Sửa
                  </button>
                  <button
                    onClick={() => onDelete(user)}
                    className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                    title="Xóa người dùng"
                  >
                    🗑️ Xóa
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
