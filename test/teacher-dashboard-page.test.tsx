import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 7, role: 'teacher', name: 'Teacher A' },
    loading: false,
  }),
}));

describe('TeacherDashboardPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it('renders canonical dashboard snapshot from top-level payload', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        summary: {
          total_activities: 6,
          pending_activities: 2,
          published_activities: 3,
          total_participants: 12,
          total_attended: 9,
        },
        activitiesByMonth: [{ month: '2026-04', count: 6, participants: 12 }],
        activitiesByType: [
          { type_name: 'Ky nang', type_color: '#22C55E', count: 3, avg_participants: 7.5 },
        ],
        participationByClass: [
          {
            class_name: 'CTK42A',
            total_students: 20,
            active_students: 12,
            participation_rate: 60,
          },
        ],
        recentActivities: [
          {
            id: 11,
            title: 'Workshop A',
            date_time: '2026-04-20T08:00:00.000Z',
            status: 'published',
            participant_count: 25,
            attended_count: 20,
          },
        ],
        topStudents: [
          {
            student_id: 101,
            student_name: 'Hoc Vien A',
            class_name: 'CTK42A',
            total_points: 30,
            activities_count: 4,
          },
        ],
      }),
    })) as any;

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/dashboard/page')).default;
    render(<Page />);

    expect(await screen.findByTestId('dashboard-heading')).toHaveTextContent('Tong quan teacher');
    expect(screen.getByTestId('stat-total-activities')).toHaveTextContent('6');
    expect(screen.getByTestId('stat-pending-activities')).toHaveTextContent('2');
    expect(screen.getByTestId('attendance-policy-cta')).toHaveTextContent(
      'Dieu phoi diem danh theo policy'
    );
    expect(screen.getByText('Workshop A')).toBeInTheDocument();
    expect(screen.getByText('Hoc Vien A')).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/teacher/dashboard-stats');
    });
  });
});
