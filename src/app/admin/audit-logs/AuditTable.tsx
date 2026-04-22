'use client';

import { AuditLog } from './types';

interface AuditTableProps {
  logs: AuditLog[];
  onViewDetails: (log: AuditLog) => void;
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

export default function AuditTable({ logs, onViewDetails }: AuditTableProps) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500 text-lg">Không có audit logs</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actor
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Action
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Target
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Details
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-500">#{log.id}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {new Date(log.created_at).toLocaleString('vi-VN')}
                </td>
                <td className="px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">{log.actor_name || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">{log.actor_email}</div>
                    <span
                      className={`inline-block mt-1 px-2 py-1 text-xs rounded ${getRoleBadgeClass(log.actor_role)}`}
                    >
                      {log.actor_role}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-1 text-xs rounded font-medium ${getActionBadgeClass(log.action)}`}
                  >
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="font-medium">{log.target_table}</div>
                  {log.target_id && (
                    <div className="text-xs text-gray-500">ID: {log.target_id}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                  {log.details ? (
                    <span className="cursor-pointer hover:text-blue-600" title={log.details}>
                      {log.details.substring(0, 50)}...
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  <button
                    onClick={() => onViewDetails(log)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
