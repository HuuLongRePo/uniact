/**
 * Activity Workflow State Machine
 * Implements workflow validation and derived UI statuses.
 */

export type ActivityStatus =
  | 'draft'
  | 'published'
  | 'completed'
  | 'cancelled';

export type ActivityApprovalStatus = 'draft' | 'requested' | 'approved' | 'rejected';
export type ActivityDisplayStatus = ActivityStatus | 'pending' | 'rejected';

export interface StatusTransition {
  from: ActivityStatus;
  to: ActivityStatus;
  requiredRole?: ('admin' | 'teacher' | 'student')[];
  validate?: (activity: any) => { valid: boolean; error?: string };
}

/**
 * Allowed status transitions in the workflow.
 */
const VALID_TRANSITIONS: StatusTransition[] = [
  {
    from: 'draft',
    to: 'published',
    requiredRole: ['admin'],
    validate: (activity) => {
      if (activity?.approval_status !== 'approved') {
        return {
          valid: false,
          error: 'Chỉ được công bố khi hoạt động đã được phê duyệt',
        };
      }

      return { valid: true };
    },
  },
  {
    from: 'published',
    to: 'completed',
    requiredRole: ['teacher', 'admin'],
  },
  {
    from: 'draft',
    to: 'cancelled',
    requiredRole: ['teacher', 'admin'],
  },
  {
    from: 'published',
    to: 'cancelled',
    requiredRole: ['teacher', 'admin'],
  },
];

export function canSubmitForApproval(
  status: ActivityStatus,
  approvalStatus: ActivityApprovalStatus
): { valid: boolean; error?: string } {
  if (status !== 'draft') {
    return {
      valid: false,
      error: `Không thể gửi phê duyệt khi trạng thái hoạt động là "${status}"`,
    };
  }

  if (approvalStatus === 'requested') {
    return {
      valid: false,
      error: 'Hoạt động đã được gửi để phê duyệt',
    };
  }

  if (!['draft', 'rejected'].includes(approvalStatus)) {
    return {
      valid: false,
      error: `Không thể gửi phê duyệt khi approval_status là "${approvalStatus}"`,
    };
  }

  return { valid: true };
}

export function canDecideApproval(
  approvalStatus: ActivityApprovalStatus
): { valid: boolean; error?: string } {
  if (approvalStatus !== 'requested') {
    return {
      valid: false,
      error: `Không thể xử lý phê duyệt khi approval_status là "${approvalStatus}"`,
    };
  }

  return { valid: true };
}

/**
 * DB signal for "chờ duyệt" is approval_status='requested',
 * but UI/list screens often need a derived "pending" value.
 */
export function getActivityDisplayStatus(
  status: ActivityStatus | string,
  approvalStatus?: ActivityApprovalStatus | string | null
): ActivityDisplayStatus {
  if (approvalStatus === 'requested') {
    return 'pending';
  }

  if (approvalStatus === 'rejected' || status === 'rejected') {
    return 'rejected';
  }

  if (status === 'published' || status === 'completed' || status === 'cancelled') {
    return status;
  }

  return 'draft';
}

export function validateTransition(
  currentStatus: ActivityStatus,
  newStatus: ActivityStatus,
  userRole: 'admin' | 'teacher' | 'student',
  activity?: any
): { valid: boolean; error?: string } {
  if (currentStatus === newStatus) {
    return { valid: true };
  }

  const transition = VALID_TRANSITIONS.find((t) => t.from === currentStatus && t.to === newStatus);

  if (!transition) {
    return {
      valid: false,
      error: `Không thể chuyển từ "${currentStatus}" sang "${newStatus}"`,
    };
  }

  if (transition.requiredRole && !transition.requiredRole.includes(userRole)) {
    return {
      valid: false,
      error: `Vai trò "${userRole}" không có quyền thực hiện thao tác này`,
    };
  }

  if (transition.validate && activity) {
    const validationResult = transition.validate(activity);
    if (!validationResult.valid) {
      return validationResult;
    }
  }

  return { valid: true };
}

export function getNextStatuses(
  currentStatus: ActivityStatus,
  userRole: 'admin' | 'teacher' | 'student'
): ActivityStatus[] {
  return VALID_TRANSITIONS.filter(
    (t) => t.from === currentStatus && (!t.requiredRole || t.requiredRole.includes(userRole))
  ).map((t) => t.to);
}

export function getStatusLabel(status: ActivityStatus): string {
  const labels: Record<ActivityStatus, string> = {
    draft: 'Bản nháp',
    published: 'Đã công bố',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy',
  };

  return labels[status] || status;
}

export function getStatusColor(status: ActivityStatus): string {
  const colors: Record<ActivityStatus, string> = {
    draft: '#6B7280',
    published: '#3B82F6',
    completed: '#059669',
    cancelled: '#EF4444',
  };

  return colors[status] || '#6B7280';
}
