'use client';

import { Search } from 'lucide-react';

interface ActivityFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  workflowFilter: string;
  onWorkflowFilterChange: (value: string) => void;
  reviewFilter: string;
  onReviewFilterChange: (value: string) => void;
}

export default function ActivityFilters({
  search,
  onSearchChange,
  workflowFilter,
  onWorkflowFilterChange,
  reviewFilter,
  onReviewFilterChange,
}: ActivityFiltersProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm hoạt động, giảng viên..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <select
            value={workflowFilter}
            onChange={(e) => onWorkflowFilterChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tất cả workflow</option>
            <option value="draft">Nháp</option>
            <option value="pending">Đã gửi duyệt</option>
            <option value="published">Đã công bố</option>
            <option value="completed">Hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        </div>

        <div>
          <select
            value={reviewFilter}
            onChange={(e) => onReviewFilterChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tất cả review</option>
            <option value="draft">Chưa gửi duyệt</option>
            <option value="requested">Đã gửi duyệt</option>
            <option value="approved">Đã duyệt (đã công bố)</option>
            <option value="rejected">Bị từ chối</option>
          </select>
        </div>
      </div>
    </div>
  );
}
