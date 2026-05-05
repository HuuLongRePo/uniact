import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MyActivitiesPage from '@/app/student/my-activities/page';

const { pushMock, toastMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => '/student/my-activities',
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 88, role: 'student', name: 'Student Demo' },
    loading: false,
  }),
}));

vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn((message?: string) => toastMock(message)), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('@/components/LoadingSpinner', () => ({
  default: () => React.createElement('div', { 'data-testid': 'loading-spinner' }, 'Loading'),
}));

vi.mock('@/components/ui/ConfirmDialog', () => ({
  ConfirmDialog: () => null,
}));

function jsonResponse(body: any, ok: boolean = true, status: number = ok ? 200 : 400) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  };
}

describe('MyActivitiesPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    toastMock.mockReset();
  });

  it('reads registrations from canonical successResponse payload', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === '/api/activities/my-registrations') {
        return jsonResponse({
          success: true,
          data: {
            registrations: {
              upcoming: [
                {
                  id: 1,
                  activity_id: 101,
                  attendance_status: 'registered',
                  achievement_level: null,
                  feedback: null,
                  registered_at: '2026-04-10T08:00:00.000Z',
                  title: 'Upcoming Activity',
                  description: 'Desc',
                  date_time: '2099-04-20T08:00:00.000Z',
                  location: 'Hall A',
                  activity_status: 'published',
                  teacher_name: 'Teacher A',
                  participant_count: 7,
                  max_participants: 20,
                },
              ],
              completed: [],
              cancelled: [],
            },
          },
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    render(React.createElement(MyActivitiesPage));

    expect(await screen.findByText('Upcoming Activity')).toBeInTheDocument();
    expect(screen.getByText('Tác vụ nhanh')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sắp diễn ra \(1\)/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/activities/my-registrations');
    });
  });
});
