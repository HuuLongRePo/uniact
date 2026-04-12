'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useDebounce } from '@/lib/debounce-hooks';
import ActivityFilters from './ActivityFilters';
import ActivityStats from './ActivityStats';
import ActivityTable from './ActivityTable';
import { Activity } from './types';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export default function AdminActivitiesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isListLoading, setIsListLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [approvalFilter, setApprovalFilter] = useState<string>('all');
  const [deleteActivity, setDeleteActivity] = useState<Activity | null>(null);

  const debouncedSearch = useDebounce(search, 400);
  const effectiveSearch = debouncedSearch.trim().toLowerCase();

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchActivities();
    }
  }, [user, authLoading, router]);

  const fetchActivities = async () => {
    try {
      setIsListLoading(true);
      const response = await fetch('/api/admin/activities');
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || data.data?.activities || []);
      }
    } catch (error) {
      console.error('Error loading activities:', error);
      toast.error('Không thể tải danh sách hoạt động');
    } finally {
      setIsListLoading(false);
    }
  };

  const performDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/activities/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Đã xóa hoạt động');
        fetchActivities();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Không thể xóa hoạt động');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Lỗi khi xóa hoạt động');
    }
  };

  const filteredActivities = activities.filter((activity) => {
    const matchSearch =
      effectiveSearch.length === 0 ||
      activity.title.toLowerCase().includes(effectiveSearch) ||
      activity.description.toLowerCase().includes(effectiveSearch) ||
      activity.teacher_name.toLowerCase().includes(effectiveSearch);

    const matchStatus = statusFilter === 'all' || activity.status === statusFilter;
    const matchApproval = approvalFilter === 'all' || activity.approval_status === approvalFilter;

    return matchSearch && matchStatus && matchApproval;
  });

  if (authLoading) return <LoadingSpinner />;
  if (!user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quản lý hoạt động</h1>
            <p className="text-gray-600 mt-2">Tất cả hoạt động trong hệ thống</p>
          </div>
          <Link
            href="/admin/approvals"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <CheckCircle className="w-5 h-5" />
            Phê duyệt hoạt động
          </Link>
        </div>

        {/* Filters */}
        <ActivityFilters
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          approvalFilter={approvalFilter}
          onApprovalFilterChange={setApprovalFilter}
        />

        {/* Stats Summary */}
        <ActivityStats activities={activities} />

        {/* Activities Table */}
        <ActivityTable
          activities={filteredActivities}
          loading={isListLoading}
          onDelete={(activity) => setDeleteActivity(activity)}
        />

        {/* Total count */}
        <div className="mt-4 text-sm text-gray-600 text-center">
          Hiển thị {filteredActivities.length} / {activities.length} hoạt động
        </div>

        <ConfirmDialog
          isOpen={!!deleteActivity}
          title="Xác nhận xóa hoạt động"
          message={
            deleteActivity ? `Bạn có chắc chắn muốn xóa hoạt động "${deleteActivity.title}"?` : ''
          }
          confirmText="Xóa"
          cancelText="Hủy"
          variant="danger"
          onCancel={() => setDeleteActivity(null)}
          onConfirm={async () => {
            if (!deleteActivity) return;
            await performDelete(deleteActivity.id);
            setDeleteActivity(null);
          }}
        />
      </div>
    </div>
  );
}
