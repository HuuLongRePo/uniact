'use client';

import { Eye, Pencil, Trash2 } from 'lucide-react';
import { formatVietnamDateTime } from '@/lib/timezone';
import { getRoleBadgeClass, getRoleLabel } from './roles';
import { User } from './types';

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

function displayName(user: User) {
  return user.full_name || user.username || 'Nguoi dung';
}

function displayCode(user: User) {
  return user.code || user.student_code || '-';
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
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500 shadow-sm">
        Dang tai danh sach nguoi dung...
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white px-4 py-12 text-center shadow-sm">
        <div className="text-base font-medium text-slate-900">Khong co nguoi dung nao phu hop</div>
        <p className="mt-2 text-sm text-slate-500">
          Thu doi bo loc hoac tao tai khoan moi cho nhom nay.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      {loading && users.length > 0 && (
        <div className="border-b border-slate-200 px-4 py-3 text-sm text-slate-500">
          Dang cap nhat danh sach...
        </div>
      )}

      <div className="grid gap-3 p-4 lg:hidden">
        {users.map((user) => (
          <div key={user.id} className="rounded-3xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-slate-900">
                  {displayName(user)}
                </div>
                <div className="mt-1 truncate text-sm text-slate-500">{user.email}</div>
              </div>
              <input
                type="checkbox"
                checked={selectedUsers.has(user.id)}
                onChange={() => onToggleSelect(user.id)}
                className="mt-1 h-4 w-4 cursor-pointer"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRoleBadgeClass(
                  user.role
                )}`}
              >
                {getRoleLabel(user.role)}
              </span>
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                Ma: {displayCode(user)}
              </span>
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                Lop: {user.role === 'teacher' ? user.teaching_class_name || '-' : user.class_name || '-'}
              </span>
            </div>

            <div className="mt-4 text-xs text-slate-500">
              Tao ngay {formatVietnamDateTime(user.created_at, 'date')}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onView(user)}
                className="inline-flex items-center justify-center gap-1 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Eye className="h-3.5 w-3.5" />
                Xem
              </button>
              <button
                type="button"
                onClick={() => onEdit(user)}
                className="inline-flex items-center justify-center gap-1 rounded-2xl bg-cyan-700 px-3 py-2 text-xs font-medium text-white hover:bg-cyan-800"
              >
                <Pencil className="h-3.5 w-3.5" />
                Sua
              </button>
              <button
                type="button"
                onClick={() => onDelete(user)}
                className="inline-flex items-center justify-center gap-1 rounded-2xl bg-rose-700 px-3 py-2 text-xs font-medium text-white hover:bg-rose-800"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Xoa
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <input
                  type="checkbox"
                  checked={selectedUsers.size === users.length && users.length > 0}
                  onChange={onToggleSelectAll}
                  className="h-4 w-4 cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Nguoi dung
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Vai tro
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Lop / scope
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Ngay tao
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Thao tac
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-4 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={selectedUsers.has(user.id)}
                    onChange={() => onToggleSelect(user.id)}
                    className="h-4 w-4 cursor-pointer"
                  />
                </td>
                <td className="px-4 py-4">
                  <div className="font-medium text-slate-900">{displayName(user)}</div>
                  <div className="mt-1 text-xs text-slate-500">Ma: {displayCode(user)}</div>
                </td>
                <td className="px-4 py-4 text-sm text-slate-600">{user.email}</td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRoleBadgeClass(
                      user.role
                    )}`}
                  >
                    {getRoleLabel(user.role)}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-slate-600">
                  {user.role === 'teacher' ? user.teaching_class_name || '-' : user.class_name || '-'}
                </td>
                <td className="px-4 py-4 text-sm text-slate-500">
                  {formatVietnamDateTime(user.created_at, 'date')}
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onView(user)}
                      className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Xem
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(user)}
                      className="inline-flex items-center gap-1 rounded-2xl bg-cyan-700 px-3 py-2 text-xs font-medium text-white hover:bg-cyan-800"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Sua
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(user)}
                      className="inline-flex items-center gap-1 rounded-2xl bg-rose-700 px-3 py-2 text-xs font-medium text-white hover:bg-rose-800"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Xoa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
