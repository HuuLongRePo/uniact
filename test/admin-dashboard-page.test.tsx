import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { User } from '@/types/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardAdminPage from '@/features/dashboard/DashboardAdminPage';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminStats, useReportData } from '@/lib/domain-hooks';

const { pushMock, refetchStatsMock, refetchDashMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refetchStatsMock: vi.fn(),
  refetchDashMock: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/lib/domain-hooks', () => ({
  useAdminStats: vi.fn(),
  useReportData: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock('@/components/ActivitySkeleton', () => ({
  default: () => <div data-testid="activity-skeleton">Loading</div>,
}));

function createAuthState(role: string = 'admin') {
  return {
    user: { id: 1, role } as User,
    loading: false,
    login: vi.fn(async () => undefined),
    logout: vi.fn(async () => undefined),
    register: vi.fn(async () => undefined),
  };
}

describe('Admin dashboard page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(createAuthState());
    vi.mocked(useAdminStats).mockReturnValue({
      data: {
        database: { size_mb: '12.4', table_count: 22 },
        activities: {
          draft: 2,
          published: 5,
          completed: 7,
          cancelled: 1,
          new_24h: 3,
        },
        participations: {
          total: 100,
          registered: 40,
          attended: 52,
          absent: 8,
          new_24h: 9,
        },
        attendance: {
          total: 100,
          attended: 52,
          absent: 8,
          new_24h: 7,
          rate: 52,
        },
        users: { new_24h: 4 },
        system: {
          uptime_hours: 10.4,
          node_version: '20.10.0',
          memory: {
            heap_used_mb: '128',
            heap_total_mb: '256',
          },
        },
        top_activities: [{ id: 9, title: 'Hoi thao ky nang', participant_count: 44 }],
      },
      loading: false,
      refetch: refetchStatsMock,
    } as any);
    vi.mocked(useReportData).mockReturnValue({
      data: {
        stats: {
          total_students: 240,
          total_activities: 38,
        },
        activities_by_month: [
          { month: '2026-01', total: 4 },
          { month: '2026-02', total: 6 },
        ],
        top_students: [
          { id: 7, name: 'Nguyen An', email: 'an@uniact.test', total_points: 95 },
        ],
        participation_by_class: [
          { id: 1, name: 'CTK42A', activities_participated: 12, distinct_students: 30 },
        ],
        popular_activities: [
          { id: 11, title: 'Tiep suc mua thi', participant_count: 60 },
        ],
      },
      loading: false,
      refetch: refetchDashMock,
    } as any);

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('/api/system-config?category=attendance')) {
        return {
          ok: true,
          json: async () => ({
            configs: [
              { config_key: 'attendance_policy_version', config_value: 'rollout-v2' },
              {
                config_key: 'attendance_face_pilot_selection_mode',
                config_value: 'selected_only',
              },
              { config_key: 'attendance_qr_fallback_preset', config_value: 'strict-lan' },
              {
                config_key: 'attendance_face_pilot_activity_ids',
                config_value: '[101,102,103]',
              },
            ],
          }),
        } as Response;
      }

      if (url.includes('/api/teacher/attendance/pilot-activities')) {
        return {
          ok: true,
          json: async () => ({
            activities: [
              { id: 101, policy_summary: { eligible: true } },
              { id: 102, policy_summary: { eligible: false } },
              { id: 103, policy_summary: { eligible: true } },
            ],
          }),
        } as Response;
      }

      throw new Error(`Unhandled fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;
  });

  it('renders admin overview, attendance rollout summary and refresh actions', async () => {
    render(<DashboardAdminPage />);

    expect(await screen.findByTestId('dashboard-heading')).toHaveTextContent('Tong quan admin');
    expect(await screen.findByTestId('admin-attendance-policy-overview')).toBeInTheDocument();
    expect(screen.getByText('rollout-v2')).toBeInTheDocument();
    expect(screen.getByText('strict-lan')).toBeInTheDocument();
    expect(screen.getAllByText('Nguyen An').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /Mo chinh sach diem danh/i })).toHaveAttribute(
      'href',
      '/admin/system-config/attendance-policy'
    );

    fireEvent.click(screen.getByRole('button', { name: /Tai lai dashboard/i }));
    expect(refetchStatsMock).toHaveBeenCalledTimes(1);
    expect(refetchDashMock).toHaveBeenCalledTimes(1);
  });

  it('redirects guests away from the admin dashboard', async () => {
    vi.mocked(useAuth).mockReturnValue({
      ...createAuthState('student'),
      user: null,
    } as any);

    render(<DashboardAdminPage />);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/login');
    });
  });
});
