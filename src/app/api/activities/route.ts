import { NextRequest } from 'next/server';
import { dbHelpers } from '@/lib/database';
import { cache, CACHE_TTL } from '@/lib/cache';
import { ApiError, errorResponse, successResponse } from '@/lib/api-response';
import { requireApiAuth, requireApiRole } from '@/lib/guards';
import { validateCreateActivityBody } from '@/lib/activity-validation';
import { getActivityDisplayStatus } from '@/lib/activity-workflow';

type StudentActivitySummaryRecord = {
  id: number;
  title: string;
  description: string | null;
  date_time: string;
  location: string;
  max_participants: number | null;
  registration_deadline: string | null;
  status: string;
  approval_status: string;
  teacher_name: string | null;
  participant_count: number | string | null;
  available_slots: number | string | null;
  is_registered: number | string | boolean | null;
  registration_status: string | null;
  participation_source?: string | null;
  is_mandatory?: number | string | boolean | null;
  applies_to_student: number | string | boolean | null;
  applicability_scope: string | null;
  activity_type: string | null;
  organization_level: string | null;
};

type WorkflowAwareActivityRecord = {
  status: string;
  approval_status?: string | null;
};

function parseStatusFilters(rawStatus: string | null): string[] {
  if (!rawStatus) return [];

  return Array.from(
    new Set(
      rawStatus
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => (item === 'ongoing' ? 'published' : item))
    )
  );
}

function normalizeStudentActivitySummary(activity: StudentActivitySummaryRecord) {
  const participantCount = Number(activity.participant_count || 0);
  const maxParticipants =
    activity.max_participants === null ? null : Number(activity.max_participants || 0);
  const fallbackSlots =
    maxParticipants === null ? null : Math.max(0, maxParticipants - participantCount);
  const appliesToStudent = Boolean(Number(activity.applies_to_student ?? 1));
  const applicabilityScope = activity.applicability_scope || 'open_scope';
  const participationSource = activity.participation_source || null;
  const isMandatory =
    participationSource === 'assigned' || Boolean(Number(activity.is_mandatory || 0));
  const startTime = new Date(activity.date_time).getTime();
  const canRegister =
    !Boolean(Number(activity.is_registered || 0)) &&
    !isMandatory &&
    appliesToStudent &&
    activity.status === 'published' &&
    !Number.isNaN(startTime) &&
    startTime > Date.now();
  const canCancel =
    Boolean(Number(activity.is_registered || 0)) &&
    !isMandatory &&
    activity.registration_status === 'registered' &&
    !Number.isNaN(startTime) &&
    (startTime - Date.now()) / (1000 * 60 * 60) >= 24;
  const applicabilityReason =
    applicabilityScope === 'mandatory_class_scope'
      ? 'Áp dụng vì lớp của bạn nằm trong nhóm bắt buộc của hoạt động.'
      : applicabilityScope === 'voluntary_class_scope'
        ? 'Bạn có thể tự đăng ký vì lớp của bạn nằm trong nhóm được mở đăng ký.'
        : applicabilityScope === 'class_scope_match'
          ? 'Áp dụng vì lớp của bạn nằm trong phạm vi hoạt động.'
          : applicabilityScope === 'class_scope_mismatch'
            ? 'Không thuộc phạm vi của bạn vì hoạt động đang dành riêng cho lớp khác.'
            : 'Hoạt động mở cho tất cả học viên.';

  return {
    id: Number(activity.id),
    title: activity.title,
    description: activity.description || '',
    date_time: activity.date_time,
    location: activity.location,
    max_participants: maxParticipants,
    registration_deadline: activity.registration_deadline,
    status: activity.status,
    approval_status: activity.approval_status,
    display_status: getActivityDisplayStatus(activity.status, activity.approval_status),
    teacher_name: activity.teacher_name || 'Chưa phân công',
    participant_count: participantCount,
    available_slots:
      maxParticipants === null
        ? null
        : Math.max(0, Number(activity.available_slots ?? fallbackSlots ?? 0)),
    is_registered: Boolean(Number(activity.is_registered || 0)),
    registration_status: activity.registration_status || null,
    participation_source: participationSource,
    is_mandatory: isMandatory,
    can_register: canRegister,
    can_cancel: canCancel,
    applies_to_student: appliesToStudent,
    applicability_scope: applicabilityScope,
    applicability_reason: applicabilityReason,
    activity_type: activity.activity_type || null,
    organization_level: activity.organization_level || null,
  };
}

function normalizeWorkflowAwareActivity<T extends WorkflowAwareActivityRecord>(activity: T) {
  return {
    ...activity,
    display_status: getActivityDisplayStatus(activity.status, activity.approval_status),
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiAuth(request);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const status = searchParams.get('status');
    const statusFilters = parseStatusFilters(status);
    const scope = searchParams.get('scope') === 'operational' ? 'operational' : 'owned';
    const offset = (page - 1) * limit;

    // Cache key với pagination
    const cacheKey = `activities:${user.role}:${user.id}:scope${scope}:page${page}:limit${limit}:status${statusFilters.join(',') || 'all'}`;

    const result = await cache.get(
      cacheKey,
      CACHE_TTL.CLASSES, // 5 minutes
      async () => {
        let data: any[] = [];
        let total = 0;

        if (user.role === 'admin') {
          data = (await dbHelpers.getAllActivitiesWithTeachers()) as any[];
          data = data.map(normalizeWorkflowAwareActivity);
          total = data.length;
          if (statusFilters.length > 0) {
            data = data.filter((a: any) => statusFilters.includes(a.display_status));
            total = data.length;
          }
          data = data.slice(offset, offset + limit);
        } else if (user.role === 'teacher') {
          data =
            scope === 'operational'
              ? ((await dbHelpers.getOperationalActivitiesByTeacher(user.id)) as any[])
              : ((await dbHelpers.getActivitiesByTeacher(user.id)) as any[]);
          data = data.map(normalizeWorkflowAwareActivity);
          total = data.length;
          if (statusFilters.length > 0) {
            data = data.filter((a: any) => statusFilters.includes(a.display_status));
            total = data.length;
          }
          data = data.slice(offset, offset + limit);
        } else {
          // Student: filter at SQL level for better performance
          data = (await dbHelpers.getActivitiesForStudent(user.id, user.class_id)) as any[];
          data = data.map(normalizeStudentActivitySummary);
          total = data.length;
          if (statusFilters.length > 0) {
            data = data.filter((a: any) => statusFilters.includes(a.display_status));
            total = data.length;
          }
          data = data.slice(offset, offset + limit);
        }
        return { activities: data || [], total };
      }
    );

    return successResponse(result);
  } catch (error: any) {
    console.error('Lỗi lấy danh sách hoạt động:', error);
    return errorResponse(ApiError.internalError('Lỗi máy chủ'));
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiRole(request, ['teacher']);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(ApiError.badRequest('Dữ liệu JSON không hợp lệ'));
    }

    const validation = validateCreateActivityBody(body);
    if (!validation.data) {
      return errorResponse(
        ApiError.validation('Dữ liệu tạo hoạt động không hợp lệ', validation.errors)
      );
    }

    const {
      title,
      description,
      date_time,
      location,
      max_participants,
      class_ids,
      mandatory_class_ids,
      voluntary_class_ids,
      registration_deadline,
      activity_type_id,
      organization_level_id,
    } = validation.data;

    const scopedClassIds = Array.from(
      new Set([...class_ids, ...(mandatory_class_ids || []), ...(voluntary_class_ids || [])])
    );

    if (scopedClassIds.length > 0) {
      const classes = (await dbHelpers.getAllClasses()) as Array<{ id: number }>;
      const validClassIds = new Set((classes || []).map((item) => Number(item.id)));
      const invalidClassIds = scopedClassIds.filter(
        (classId) => !validClassIds.has(Number(classId))
      );

      if (invalidClassIds.length > 0) {
        return errorResponse(
          ApiError.validation('Lớp được chọn không hợp lệ', {
            class_ids: `ID lớp không tồn tại: ${invalidClassIds.join(', ')}`,
          })
        );
      }
    }

    const result = await dbHelpers.createActivity({
      title,
      description,
      date_time,
      location,
      teacher_id: user.id,
      max_participants,
      class_ids,
      mandatory_class_ids,
      voluntary_class_ids,
      registration_deadline,
      activity_type_id,
      organization_level_id,
      // Enforce 2-step: creation -> draft (approval_status draft)
      status: 'draft',
      approval_status: 'draft',
    });

    if (!result.lastID) {
      throw new Error('Không thể tạo hoạt động');
    }

    // Keep status as 'draft' by default; allow opt-in auto publish via env
    if (process.env.AUTO_PUBLISH === 'true') {
      try {
        await dbHelpers.updateActivity(result.lastID, { status: 'published' });
      } catch {}
    }

    // Invalidate activities cache
    cache.invalidatePrefix('activities:');

    // Lấy thông tin activity vừa tạo
    const activities = (await dbHelpers.getActivitiesByTeacher(user.id)) as any[];
    const newActivity = activities.find((a: any) => a.id === result.lastID);

    return successResponse({ activity: newActivity }, 'Tạo hoạt động thành công', 201);
  } catch (error: any) {
    console.error('Create activity error:', error);
    return errorResponse(ApiError.internalError('Lỗi server'));
  }
}
