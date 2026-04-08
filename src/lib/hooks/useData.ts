/**
 * Custom hooks for data fetching
 * Eliminates duplicate fetch logic across pages
 */

import { useState, useEffect, useCallback } from 'react';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseFetchOptions {
  skip?: boolean;
  refetchOnMount?: boolean;
}

/**
 * Generic fetch hook
 */
export function useFetch<T>(
  url: string,
  options: UseFetchOptions = {}
): FetchState<T> & { refetch: () => Promise<void> } {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    if (options.skip) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const json = await response.json();
      setState({ data: json, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [url, options.skip]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    refetch: fetchData,
  };
}

/**
 * Hook for fetching activities
 */
export function useActivities(filters?: { status?: string; creatorId?: number; limit?: number }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.creatorId) params.set('creator_id', filters.creatorId.toString());
  if (filters?.limit) params.set('limit', filters.limit.toString());

  const url = `/api/activities${params.toString() ? `?${params}` : ''}`;
  const { data, loading, error, refetch } = useFetch<{ activities: any[] }>(url);

  return {
    activities: data?.activities || [],
    loading,
    error,
    refetch,
  };
}

/**
 * Hook for fetching students
 */
export function useStudents(filters?: { classId?: number; search?: string }) {
  const params = new URLSearchParams();
  if (filters?.classId) params.set('class_id', filters.classId.toString());
  if (filters?.search) params.set('search', filters.search);

  const url = `/api/users?role=student${params.toString() ? `&${params}` : ''}`;
  const { data, loading, error, refetch } = useFetch<{ users: any[] }>(url);

  return {
    students: data?.users || [],
    loading,
    error,
    refetch,
  };
}

/**
 * Hook for fetching classes
 */
export function useClasses() {
  const { data, loading, error, refetch } = useFetch<{ classes: any[] }>('/api/classes');

  return {
    classes: data?.classes || [],
    loading,
    error,
    refetch,
  };
}

/**
 * Hook for fetching notifications
 */
export function useNotifications() {
  const { data, loading, error, refetch } = useFetch<{ notifications: any[] }>(
    '/api/notifications'
  );

  return {
    notifications: data?.notifications || [],
    loading,
    error,
    refetch,
  };
}

/**
 * Hook for fetching user profile
 */
export function useProfile() {
  const { data, loading, error, refetch } = useFetch<{ user: any }>('/api/profile/me');

  return {
    profile: data?.user || null,
    loading,
    error,
    refetch,
  };
}

/**
 * Hook for fetching participations
 */
export function useParticipations(filters?: {
  studentId?: number;
  activityId?: number;
  status?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.studentId) params.set('student_id', filters.studentId.toString());
  if (filters?.activityId) params.set('activity_id', filters.activityId.toString());
  if (filters?.status) params.set('status', filters.status);

  const url = `/api/participations${params.toString() ? `?${params}` : ''}`;
  const { data, loading, error, refetch } = useFetch<{ participations: any[] }>(url);

  return {
    participations: data?.participations || [],
    loading,
    error,
    refetch,
  };
}

/**
 * Hook for fetching activity types
 */
export function useActivityTypes() {
  const { data, loading, error, refetch } = useFetch<{ activityTypes: any[] }>(
    '/api/activity-types'
  );

  return {
    activityTypes: data?.activityTypes || [],
    loading,
    error,
    refetch,
  };
}

/**
 * Hook for fetching organization levels
 */
export function useOrganizationLevels() {
  const { data, loading, error, refetch } = useFetch<{ organizationLevels: any[] }>(
    '/api/organization-levels'
  );

  return {
    organizationLevels: data?.organizationLevels || [],
    loading,
    error,
    refetch,
  };
}

/**
 * Hook for mutation (POST, PUT, DELETE)
 */
export function useMutation<TData = any, TVariables = any>() {
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
  }>({
    loading: false,
    error: null,
  });

  const mutate = useCallback(
    async (
      url: string,
      options: {
        method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
        body?: TVariables;
      }
    ): Promise<TData | null> => {
      setState({ loading: true, error: null });

      try {
        const response = await fetch(url, {
          method: options.method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setState({ loading: false, error: null });
        return data;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setState({ loading: false, error: errorMessage });
        throw error;
      }
    },
    []
  );

  return {
    ...state,
    mutate,
  };
}
