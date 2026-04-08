/**
 * Domain-specific hooks - Activities, Students, Classes, etc.
 */

import { usePagination, useQuery, useMutation, useSearch } from './fetch-hooks';

// ==================== Activities ====================

export function useActivityList(options?: { pageSize?: number }) {
  return usePagination<{
    id: string;
    title: string;
    description: string;
    status: string;
    date_time: string;
    class_id: string;
  }>(
    (page, limit) => `/api/activities?page=${page}&limit=${limit}&status=pending,ongoing,completed`,
    { pageSize: options?.pageSize || 20 }
  );
}

export function useActivitySearch(options?: { debounceMs?: number }) {
  return useSearch<{
    id: string;
    title: string;
    description: string;
    class_id: string;
  }>((query) => `/api/activities/search?q=${encodeURIComponent(query)}`, {
    debounceMs: options?.debounceMs || 300,
    minChars: 2,
  });
}

export function useActivityDetail(activityId: string | null) {
  return useQuery<any>(activityId ? `/api/activities/${activityId}` : '', {
    enabled: !!activityId,
    cache: true,
  });
}

export function useActivityMutations() {
  const create = useMutation<any, any>('POST');
  const update = useMutation<any, any>('PUT');
  const deleteActivity = useMutation<any, any>('DELETE');

  return {
    createActivity: (data: any) => create.mutate('/api/activities', data),
    updateActivity: (id: string, data: any) => update.mutate(`/api/activities/${id}`, data),
    deleteActivity: (id: string) => deleteActivity.mutate(`/api/activities/${id}`),
    creating: create.loading,
    updating: update.loading,
    deleting: deleteActivity.loading,
  };
}

// ==================== Students ====================

export function useStudentList(options?: { pageSize?: number }) {
  return usePagination<{
    id: string;
    name: string;
    email: string;
    class_id: string;
    total_points: number;
  }>((page, limit) => `/api/students?page=${page}&limit=${limit}`, {
    pageSize: options?.pageSize || 20,
  });
}

export function useStudentSearch(options?: { debounceMs?: number }) {
  return useSearch<{
    id: string;
    name: string;
    email: string;
    class_id: string;
  }>((query) => `/api/students/search?q=${encodeURIComponent(query)}`, {
    debounceMs: options?.debounceMs || 300,
    minChars: 1,
  });
}

export function useStudentDetail(studentId: string | null) {
  return useQuery<any>(studentId ? `/api/students/${studentId}` : '', {
    enabled: !!studentId,
    cache: true,
    refetchInterval: 30000, // Update every 30s
  });
}

export function useStudentScores(studentId: string | null) {
  return useQuery<any[]>(studentId ? `/api/students/${studentId}/scores` : '', {
    enabled: !!studentId,
    cache: true,
  });
}

// ==================== Classes ====================

export function useClassList(options?: { pageSize?: number }) {
  return usePagination<{
    id: string;
    name: string;
    description: string;
    teacher_id: string;
    student_count: number;
  }>((page, limit) => `/api/classes?page=${page}&limit=${limit}`, {
    pageSize: options?.pageSize || 20,
  });
}

export function useClassDetail(classId: string | null) {
  return useQuery<any>(classId ? `/api/classes/${classId}` : '', {
    enabled: !!classId,
    cache: true,
    refetchInterval: 60000,
  });
}

export function useClassStudents(classId: string | null) {
  return useQuery<any[]>(classId ? `/api/classes/${classId}/students` : '', {
    enabled: !!classId,
    cache: true,
  });
}

// ==================== Awards ====================

export function useAwardList(options?: { pageSize?: number }) {
  return usePagination<{
    id: string;
    student_id: string;
    award_type: string;
    award_name: string;
    points: number;
    issue_date: string;
  }>((page, limit) => `/api/awards?page=${page}&limit=${limit}`, {
    pageSize: options?.pageSize || 20,
  });
}

export function useStudentAwards(studentId: string | null) {
  return useQuery<any[]>(studentId ? `/api/students/${studentId}/awards` : '', {
    enabled: !!studentId,
    cache: true,
  });
}

// ==================== Attendance ====================

export function useAttendanceList(classId: string | null, options?: { pageSize?: number }) {
  return usePagination<{
    id: string;
    activity_id: string;
    student_id: string;
    status: string;
    marked_at: string;
  }>(
    (page, limit) =>
      classId
        ? `/api/classes/${classId}/attendance?page=${page}&limit=${limit}`
        : '/api/attendance?page=' + page + '&limit=' + limit,
    { pageSize: options?.pageSize || 20 }
  );
}

// ==================== Reports ====================

export function useReportData(
  reportType: string,
  options?: { startDate?: string; endDate?: string }
) {
  const params = new URLSearchParams();
  if (options?.startDate) params.append('start_date', options.startDate);
  if (options?.endDate) params.append('end_date', options.endDate);

  return useQuery<any>(
    `/api/reports/${reportType}?${params.toString()}`,
    { cache: true, cacheTime: 10 * 60 * 1000 } // Cache 10 min
  );
}

export function useStudentReports(studentId: string | null) {
  return useQuery<any>(studentId ? `/api/reports/student/${studentId}` : '', {
    enabled: !!studentId,
    cache: true,
    cacheTime: 10 * 60 * 1000,
  });
}

export function useClassReports(classId: string | null) {
  return useQuery<any>(classId ? `/api/reports/class/${classId}` : '', {
    enabled: !!classId,
    cache: true,
    cacheTime: 10 * 60 * 1000,
  });
}

// ==================== Admin ====================

export function useAdminStats() {
  return useQuery<any>('/api/admin/system-health', {
    cache: true,
    cacheTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function usePendingActivities() {
  return useQuery<any[]>(
    '/api/activities?status=pending',
    { cache: false, refetchInterval: 30000 } // No cache, update every 30s
  );
}

export function useAdminAuditLog(options?: { pageSize?: number }) {
  return usePagination<{
    id: string;
    user_id: string;
    action: string;
    resource_type: string;
    resource_id: string;
    timestamp: string;
  }>((page, limit) => `/api/admin/audit-log?page=${page}&limit=${limit}`, {
    pageSize: options?.pageSize || 50,
  });
}
