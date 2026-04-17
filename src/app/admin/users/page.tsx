'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import UserTable from './UserTable';
import UserFilters from './UserFilters';
import UserDialog from './UserDialog';
import { User } from './types';
import { useDebounce } from '@/lib/debounce-hooks';
import { getRoleBadgeClass, getRoleLabel } from './roles';

/**
 * UNIFIED USER MANAGEMENT (Phase 7):
 * Merged 3 separate pages (/admin/users, /admin/teachers, /admin/students) into one
 * with tab navigation for better UX and reduced code duplication.
 *
 * Features:
 * - Tab-based filtering: Tất cả | Giảng viên | Học viên
 * - URL sync: ?tab=all|teacher|student
 * - Backward compatibility: /admin/teachers → ?tab=teacher
 * - Class management integrated into UserDialog for students
 */

type UserTab = 'all' | 'teacher' | 'student';

export default function AdminUsersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [isListLoading, setIsListLoading] = useState(true);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Total counts for badges
  const [totalCounts, setTotalCounts] = useState({
    all: 0,
    teacher: 0,
    student: 0,
  });

  // Tab state from URL
  const tabParam = searchParams.get('tab') as UserTab | null;
  const activeTab: UserTab =
    tabParam && ['all', 'teacher', 'student'].includes(tabParam) ? tabParam : 'all';

  // Derive roleFilter from activeTab
  const roleFilter = activeTab === 'teacher' ? 'teacher' : activeTab === 'student' ? 'student' : '';

  const debouncedSearch = useDebounce(search, 400);
  const effectiveSearch = debouncedSearch.trim();

  // Bulk selection
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  // Dialog states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [userToView, setUserToView] = useState<User | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }
    if (!user) return;
    // Avoid loading for 1-character queries; wait for at least 2 chars.
    if (effectiveSearch.length === 1) return;
    fetchUsers();
    fetchTotalCounts(); // Fetch counts for badges
  }, [user, authLoading, router, effectiveSearch, roleFilter, page]);

  const fetchUsers = async () => {
    try {
      setIsListLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(effectiveSearch.length >= 2 && { search: effectiveSearch }),
        ...(roleFilter && { role: roleFilter }),
      });

      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();

      if (data.success) {
        setUsers(data.users || data.data?.users || data.data || []);
        setTotalPages(data.pagination?.totalPages || data.data?.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Không thể tải danh sách người dùng');
    } finally {
      setIsListLoading(false);
    }
  };

  const fetchTotalCounts = async () => {
    try {
      // Fetch counts for all roles
      const [allRes, teacherRes, studentRes] = await Promise.all([
        fetch('/api/admin/users?page=1&limit=1'),
        fetch('/api/admin/users?page=1&limit=1&role=teacher'),
        fetch('/api/admin/users?page=1&limit=1&role=student'),
      ]);

      const [allData, teacherData, studentData] = await Promise.all([
        allRes.json(),
        teacherRes.json(),
        studentRes.json(),
      ]);

      setTotalCounts({
        all: allData.pagination?.total || allData.data?.pagination?.total || 0,
        teacher: teacherData.pagination?.total || teacherData.data?.pagination?.total || 0,
        student: studentData.pagination?.total || studentData.data?.pagination?.total || 0,
      });
    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  };

  // Bulk selection handlers
  const toggleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map((u) => u.id)));
    }
  };

  const toggleSelectUser = (userId: number) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.size === 0) return;

    try {
      const promises = Array.from(selectedUsers).map((id) =>
        fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
      );

      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.ok).length;

      toast.success(`Đã xóa ${successCount}/${selectedUsers.size} người dùng`);
      setSelectedUsers(new Set());
      setShowBulkDeleteDialog(false);
      fetchUsers();
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Lỗi khi xóa hàng loạt');
      setShowBulkDeleteDialog(false);
    }
  };

  const handleBulkExport = () => {
    if (selectedUsers.size === 0) {
      toast.error('Chưa chọn người dùng nào');
      return;
    }

    const selectedData = users.filter((u) => selectedUsers.has(u.id));
    const headers = ['ID', 'Họ tên', 'Email', 'Vai trò', 'Lớp', 'Ngày tạo'].join(',');
    const rows = selectedData.map((u) => {
      const values = [
        u.id,
        `"${(u.full_name ?? '').replaceAll('"', '""')}"`,
        u.email ?? '',
        `"${getRoleLabel(u.role).replaceAll('"', '""')}"`,
        `"${(u.class_name ?? '').replaceAll('"', '""')}"`,
        u.created_at ?? '',
      ];
      return values.join(',');
    });

    const csv = ['\ufeff' + headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast.success(`Đã xuất ${selectedUsers.size} người dùng`);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    try {
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || 'Đã vô hiệu hóa người dùng');
        fetchUsers();
        setShowDeleteDialog(false);
        setUserToDelete(null);
      } else {
        if (data.details?.message) {
          toast.error(data.details.message, { duration: 8000 });
        } else {
          toast.error(data.error || 'Không thể xóa người dùng');
        }
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Lỗi khi xóa người dùng');
    }
  };

  if (authLoading) {
    return <LoadingSpinner />;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  // Tab change handler
  const handleTabChange = (tab: UserTab) => {
    router.push(`/admin/users?tab=${tab}`);
    setPage(1); // Reset to page 1 on tab change
  };

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 data-testid="users-heading" className="text-3xl font-bold">
          Quản Lý Người Dùng
        </h1>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => handleTabChange('all')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'all'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>👥</span>
              <span>Tất cả</span>
              <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs">
                {totalCounts.all}
              </span>
            </span>
          </button>

          <button
            onClick={() => handleTabChange('teacher')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'teacher'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>👨‍🏫</span>
              <span>Giảng viên</span>
              <span className="bg-green-100 text-green-600 px-2 py-0.5 rounded-full text-xs">
                {totalCounts.teacher}
              </span>
            </span>
          </button>

          <button
            onClick={() => handleTabChange('student')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'student'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>🎓</span>
              <span>Học viên</span>
              <span className="bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full text-xs">
                {totalCounts.student}
              </span>
            </span>
          </button>
        </nav>
      </div>

      {/* Bulk Actions Bar */}
      {selectedUsers.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-medium text-blue-900">
              ✓ Đã chọn {selectedUsers.size} người dùng
            </span>
            <button
              onClick={() => setSelectedUsers(new Set())}
              className="text-blue-600 hover:text-blue-800 text-sm underline"
            >
              Bỏ chọn tất cả
            </button>
          </div>
          <div className="flex gap-2">
            <Button variant="success" onClick={handleBulkExport}>
              Xuất CSV
            </Button>
            <Button variant="danger" onClick={() => setShowBulkDeleteDialog(true)}>
              Xóa hàng loạt ({selectedUsers.size})
            </Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <UserFilters
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        roleFilter={roleFilter}
        onRoleFilterChange={(value) => {
          // Role filter is controlled by tabs, but keep the prop for backward compatibility
          // Do nothing here as tabs handle filtering
        }}
        onCreateNew={() => setShowCreateForm(true)}
        hideRoleFilter={true} // Hide role dropdown since tabs handle it
      />

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <UserTable
          users={users}
          loading={isListLoading}
          selectedUsers={selectedUsers}
          onToggleSelect={toggleSelectUser}
          onToggleSelectAll={toggleSelectAll}
          onView={(user) => {
            setUserToView(user);
            setShowViewDialog(true);
          }}
          onEdit={(user) => {
            setUserToEdit(user);
            setShowEditForm(true);
          }}
          onDelete={(user) => {
            setUserToDelete(user);
            setShowDeleteDialog(true);
          }}
        />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <Button
            variant="secondary"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Trang Trước
          </Button>
          <span className="px-4 py-2">
            Trang {page} / {totalPages}
          </span>
          <Button
            variant="secondary"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Trang Sau
          </Button>
        </div>
      )}

      {/* Create/Edit User Dialog */}
      <UserDialog
        isOpen={showCreateForm}
        user={null}
        onClose={() => setShowCreateForm(false)}
        onSave={async (formData) => {
          try {
            setIsSavingUser(true);
            const res = await fetch('/api/admin/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (res.ok) {
              toast.success(data.message || 'Thêm người dùng thành công');
              if (data.temporaryPassword) {
                toast.success(`Mật khẩu: ${data.temporaryPassword}`, { duration: 10000 });
              }
              fetchUsers();
              setShowCreateForm(false);
            } else {
              toast.error(data.error || 'Không thể thêm người dùng');
            }
          } catch (error) {
            toast.error('Lỗi khi thêm người dùng');
          } finally {
            setIsSavingUser(false);
          }
        }}
        loading={isSavingUser}
      />

      {/* Edit User Dialog */}
      <UserDialog
        isOpen={showEditForm}
        user={userToEdit}
        onClose={() => {
          setShowEditForm(false);
          setUserToEdit(null);
        }}
        onSave={async (formData) => {
          try {
            setIsSavingUser(true);
            const res = await fetch(`/api/admin/users/${userToEdit?.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (res.ok) {
              toast.success(data.message || 'Cập nhật người dùng thành công');
              fetchUsers();
              setShowEditForm(false);
              setUserToEdit(null);
            } else {
              toast.error(data.error || 'Không thể cập nhật người dùng');
            }
          } catch (error) {
            toast.error('Lỗi khi cập nhật người dùng');
          } finally {
            setIsSavingUser(false);
          }
        }}
        loading={isSavingUser}
      />

      <ConfirmDialog
        isOpen={showBulkDeleteDialog}
        title="Xóa hàng loạt người dùng"
        message={`Bạn có chắc chắn muốn xóa ${selectedUsers.size} người dùng đã chọn? Hệ thống sẽ xử lý lần lượt từng tài khoản có thể xóa trong batch này.`}
        confirmText="Xóa hàng loạt"
        cancelText="Hủy"
        variant="danger"
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkDeleteDialog(false)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Xóa Người Dùng"
        message={`Bạn có chắc chắn muốn xóa ${userToDelete?.full_name}? Hệ thống sẽ kiểm tra và xử lý dữ liệu liên quan một cách thông minh.`}
        onConfirm={handleDelete}
        onCancel={() => {
          setShowDeleteDialog(false);
          setUserToDelete(null);
        }}
        variant="danger"
      />

      {/* View User Details Dialog */}
      {showViewDialog && userToView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">Chi Tiết Người Dùng</h3>
              <button
                onClick={() => {
                  setShowViewDialog(false);
                  setUserToView(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="col-span-2 bg-gray-50 p-4 rounded-lg">
                <h4 className="font-bold mb-3">Thông Tin Cơ Bản</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Họ và Tên:</span>
                    <p className="font-medium">{userToView.full_name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Email:</span>
                    <p className="font-medium">{userToView.email}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Vai Trò:</span>
                    <p>
                      <span
                        className={`px-2 py-1 rounded text-sm font-medium ${getRoleBadgeClass(userToView.role)}`}
                      >
                        {getRoleLabel(userToView.role)}
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Mã:</span>
                    <p className="font-medium">{userToView.code || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Lớp:</span>
                    <p className="font-medium">{userToView.class_name || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Điện Thoại:</span>
                    <p className="font-medium">{userToView.phone || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Ngày Tạo:</span>
                    <p className="font-medium">
                      {new Date(userToView.created_at).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowViewDialog(false);
                  setUserToView(null);
                  setUserToEdit(userToView);
                  setShowEditForm(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                ✏️ Chỉnh Sửa
              </button>
              <button
                onClick={() => {
                  setShowViewDialog(false);
                  setUserToView(null);
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
