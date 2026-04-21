import { NextRequest } from 'next/server';
import { getUserFromSession } from '@/lib/auth';
import { dbAll, dbRun } from '@/lib/database';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';

type AlertLevel = 'critical' | 'warning' | 'info';

type AlertRow = {
  id: number;
  user_id: number | null;
  level: AlertLevel;
  message: string;
  is_read: number | null;
  resolved: number | null;
  resolved_at: string | null;
  related_table: string | null;
  related_id: number | null;
  created_at: string;
};

async function ensureAlertsReadColumn() {
  const columns = (await dbAll(`PRAGMA table_info(alerts)`)) as Array<{ name?: string }>;
  const hasIsRead = columns.some((column) => column.name === 'is_read');

  if (!hasIsRead) {
    await dbRun(`ALTER TABLE alerts ADD COLUMN is_read INTEGER DEFAULT 0`);
  }
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeBooleanFlag(value: unknown): boolean {
  return toNumber(value) > 0 || value === true;
}

// GET /api/alerts - Get alerts for current user
export async function GET(_request: NextRequest) {
  try {
    const user = await getUserFromSession();

    if (!user) {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    await ensureAlertsReadColumn();

    let query = `
      SELECT id, user_id, level, message, is_read, resolved, resolved_at, related_table, related_id, created_at
      FROM alerts
      WHERE (user_id = ? OR user_id IS NULL)
    `;
    const params: unknown[] = [user.id];

    if (user.role === 'student') {
      query += ` AND (resolved = 0 OR resolved IS NULL)`;
    }

    query += ` ORDER BY created_at DESC LIMIT 100`;

    const rows = (await dbAll(query, params)) as AlertRow[];

    const alerts = rows.map((row) => ({
      id: toNumber(row.id),
      user_id: row.user_id !== null ? toNumber(row.user_id) : null,
      level: (row.level || 'info') as AlertLevel,
      message: String(row.message || ''),
      is_read: normalizeBooleanFlag(row.is_read),
      resolved: normalizeBooleanFlag(row.resolved),
      resolved_at: row.resolved_at ? String(row.resolved_at) : null,
      related_table: row.related_table ? String(row.related_table) : null,
      related_id: row.related_id !== null ? toNumber(row.related_id) : null,
      created_at: String(row.created_at || ''),
    }));

    const summary = {
      total_alerts: alerts.length,
      unread_alerts: alerts.filter((alert) => !alert.is_read).length,
      unresolved_alerts: alerts.filter((alert) => !alert.resolved).length,
      critical_alerts: alerts.filter((alert) => alert.level === 'critical').length,
      warning_alerts: alerts.filter((alert) => alert.level === 'warning').length,
      info_alerts: alerts.filter((alert) => alert.level === 'info').length,
      escalation_hotspots: alerts
        .filter((alert) => !alert.resolved)
        .sort((left, right) => {
          const severityWeight: Record<AlertLevel, number> = {
            critical: 3,
            warning: 2,
            info: 1,
          };
          const weightDiff = severityWeight[right.level] - severityWeight[left.level];
          if (weightDiff !== 0) return weightDiff;
          return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
        })
        .slice(0, 5),
    };

    return successResponse({ alerts, summary });
  } catch (error: unknown) {
    console.error('Get alerts error:', error);
    return errorResponse(
      ApiError.internalError(error instanceof Error ? error.message : 'Lỗi máy chủ nội bộ')
    );
  }
}

// PUT /api/alerts - Mark alert as read/resolved
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromSession();

    if (!user) {
      return errorResponse(ApiError.unauthorized('Chưa đăng nhập'));
    }

    await ensureAlertsReadColumn();

    const { alertId, action } = await request.json();

    if (!alertId) {
      return errorResponse(ApiError.badRequest('Thiếu Alert ID'));
    }

    const numericAlertId = Number(alertId);
    if (!Number.isInteger(numericAlertId) || numericAlertId <= 0) {
      return errorResponse(ApiError.badRequest('Alert ID không hợp lệ'));
    }

    if (action === 'read') {
      await dbRun(
        `UPDATE alerts
         SET is_read = 1
         WHERE id = ? AND (user_id = ? OR user_id IS NULL)`,
        [numericAlertId, user.id]
      );
    } else if (action === 'resolve') {
      if (user.role !== 'admin' && user.role !== 'teacher') {
        return errorResponse(ApiError.forbidden('Không có quyền truy cập'));
      }

      await dbRun(
        `UPDATE alerts
         SET resolved = 1, resolved_at = CURRENT_TIMESTAMP, is_read = 1
         WHERE id = ?`,
        [numericAlertId]
      );
    } else {
      return errorResponse(ApiError.badRequest('Hành động không hợp lệ'));
    }

    return successResponse({ success: true, message: 'Cập nhật cảnh báo thành công' });
  } catch (error: unknown) {
    console.error('Update alert error:', error);
    return errorResponse(
      ApiError.internalError(error instanceof Error ? error.message : 'Lỗi máy chủ nội bộ')
    );
  }
}
