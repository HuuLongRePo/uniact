'use client';

import { AuditLog } from './types';
import { Button } from '@/components/ui/Button';

interface DetailModalProps {
  log: AuditLog | null;
  onClose: () => void;
}

function getActionBadgeClass(action: string) {
  if (action.includes('CREATE')) return 'bg-green-100 text-green-800';
  if (action.includes('UPDATE') || action.includes('CHANGE')) return 'bg-blue-100 text-blue-800';
  if (action.includes('DELETE')) return 'bg-red-100 text-red-800';
  if (action.includes('APPROVE')) return 'bg-purple-100 text-purple-800';
  return 'bg-gray-100 text-gray-800';
}

function getRoleBadgeClass(role: string) {
  if (role === 'admin') return 'bg-purple-100 text-purple-800';
  if (role === 'teacher') return 'bg-blue-100 text-blue-800';
  return 'bg-green-100 text-green-800';
}

export default function DetailModal({ log, onClose }: DetailModalProps) {
  if (!log) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">Chi tiết Audit Log #{log.id}</h3>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-gray-500">Time</div>
              <div className="text-sm">{new Date(log.created_at).toLocaleString('vi-VN')}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Actor</div>
              <div className="text-sm">
                {log.actor_name} ({log.actor_email})
                <span
                  className={`ml-2 inline-block px-2 py-1 text-xs rounded ${getRoleBadgeClass(log.actor_role)}`}
                >
                  {log.actor_role}
                </span>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Action</div>
              <div>
                <span
                  className={`inline-block px-2 py-1 text-xs rounded font-medium ${getActionBadgeClass(log.action)}`}
                >
                  {log.action}
                </span>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">Target</div>
              <div className="text-sm">
                {log.target_table}
                {log.target_id && <span className="ml-2 text-gray-500">ID: {log.target_id}</span>}
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-500 mb-2">Details</div>
            <div className="bg-gray-50 p-4 rounded border text-sm font-mono whitespace-pre-wrap break-words">
              {log.details || 'No details'}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose} variant="secondary">
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}
