import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, role: 'admin' }, loading: false }),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

describe('ActivityStatisticsPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
  });

  it('surfaces canonical API errors for statistics fetch', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: 'Không thể tải báo cáo thống kê hoạt động' }),
    })) as any;

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/reports/activity-statistics/page')).default;
    render(<Page />);

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Không thể tải báo cáo thống kê hoạt động');
    });
  });

  it('renders normalized statistics rows from canonical payload', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: [
          {
            id: '11',
            title: 'Citizen Orientation',
            date_time: '2026-04-10T08:00:00.000Z',
            location: 'Hall A',
            organizer_name: 'Student Affairs',
            activity_type: 'Civic',
            organization_level: 'School',
            max_participants: '50',
            total_participants: '5',
            attended_count: '4',
            registered_only: '1',
            excellent_count: '2',
            good_count: '1',
            avg_points_per_student: '8.5',
            manual_attendance_count: '1',
            qr_attendance_count: '2',
            face_attendance_count: '1',
          },
        ],
        statistics: {
          total_activities: '1',
          total_participants: '5',
          total_attended: '4',
          total_registered_only: '1',
          total_manual_attendance: '1',
          total_qr_attendance: '2',
          total_face_attendance: '1',
          avg_participants_per_activity: '5',
          attendance_rate: '80',
          face_adoption_rate: '25',
        },
        insights: {
          top_not_participated_activities: [],
        },
      }),
    })) as any;

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/reports/activity-statistics/page')).default;
    render(<Page />);

    expect(await screen.findByText('Thống kê hoạt động')).toBeInTheDocument();
    expect(screen.getByText('Citizen Orientation')).toBeInTheDocument();
    expect(screen.getByTestId('admin-method-card-qr')).toBeInTheDocument();
    expect(screen.getByTestId('admin-not-participated-card')).toBeInTheDocument();
  });
});
