'use client';

import { Button } from '@/components/ui/Button';

interface AuditFiltersProps {
  action: string;
  targetTable: string;
  actorId: string;
  dateFrom: string;
  dateTo: string;
  onActionChange: (value: string) => void;
  onTargetTableChange: (value: string) => void;
  onActorIdChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
}

export default function AuditFilters({
  action,
  targetTable,
  actorId,
  dateFrom,
  dateTo,
  onActionChange,
  onTargetTableChange,
  onActorIdChange,
  onDateFromChange,
  onDateToChange,
  onApply,
  onReset,
}: AuditFiltersProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="font-bold mb-4">Bộ lọc</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Action</label>
          <input
            type="text"
            value={action}
            onChange={(e) => onActionChange(e.target.value)}
            placeholder="CREATE, UPDATE, DELETE..."
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Target Table</label>
          <select
            value={targetTable}
            onChange={(e) => onTargetTableChange(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="">Tất cả</option>
            <option value="users">users</option>
            <option value="classes">classes</option>
            <option value="activities">activities</option>
            <option value="participations">participations</option>
            <option value="student_scores">student_scores</option>
            <option value="awards">awards</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Actor ID</label>
          <input
            type="number"
            value={actorId}
            onChange={(e) => onActorIdChange(e.target.value)}
            placeholder="User ID"
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Từ ngày</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Đến ngày</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button onClick={onApply} variant="primary">
          Áp dụng
        </Button>
        <Button onClick={onReset} variant="secondary">
          Reset
        </Button>
      </div>
    </div>
  );
}
