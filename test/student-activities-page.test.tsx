import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StudentActivitiesPage from '@/app/student/activities/page';

const { pushMock, toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 10, role: 'student', name: 'Student Demo' },
    loading: false,
  }),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

vi.mock('@/components/ActivitySkeleton', () => ({
  default: () => React.createElement('div', { 'data-testid': 'activity-skeleton' }, 'Loading'),
}));

vi.mock('@/components/EmptyState', () => ({
  default: ({ title }: { title: string }) =>
    React.createElement('div', { 'data-testid': 'empty-state' }, title),
}));

vi.mock('@/components/ConfirmationModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? React.createElement('div', { 'data-testid': 'confirmation-modal' }, 'modal') : null,
}));

function jsonResponse(body: any, ok: boolean = true, status: number = ok ? 200 : 400) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  };
}

describe('StudentActivitiesPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
  });

  it('shows applicable activities first and can switch to not applicable list', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith('/api/activity-types')) {
        return jsonResponse({ types: [{ id: 1, name: 'Tình nguyện', base_points: 5 }] });
      }

      if (url.endsWith('/api/activities')) {
        return jsonResponse({
          activities: [
            {
              id: 1,
              title: 'Hoạt động áp dụng',
              description: 'Mô tả A',
              date_time: '2099-04-12T08:00:00.000Z',
              location: 'Hội trường A',
              teacher_name: 'Teacher A',
              participant_count: 5,
              max_participants: 20,
              status: 'published',
              is_registered: false,
              applies_to_student: true,
              applicability_reason: 'Áp dụng vì lớp của bạn nằm trong phạm vi hoạt động.',
              activity_type: 'Tình nguyện',
              organization_level: 'Cấp trường',
            },
            {
              id: 2,
              title: 'Hoạt động lớp khác',
              description: 'Mô tả B',
              date_time: '2099-04-13T08:00:00.000Z',
              location: 'Phòng B',
              teacher_name: 'Teacher B',
              participant_count: 3,
              max_participants: 20,
              status: 'published',
              is_registered: false,
              applies_to_student: false,
              applicability_reason: 'Không thuộc phạm vi của bạn vì hoạt động đang dành riêng cho lớp khác.',
              activity_type: 'Học thuật',
              organization_level: 'Cấp khoa',
            },
          ],
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    render(React.createElement(StudentActivitiesPage));

    expect(await screen.findByText('Hoạt động áp dụng')).toBeInTheDocument();
    expect(screen.queryByText('Hoạt động lớp khác')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Không thuộc phạm vi của bạn' }));

    expect(await screen.findByText('Hoạt động lớp khác')).toBeInTheDocument();
  });

  it('shows mandatory badge for assigned activities', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/activity-types')) return jsonResponse({ types: [] });
      if (url.endsWith('/api/activities')) {
        return jsonResponse({
          activities: [
            {
              id: 10,
              title: 'Hoạt động bắt buộc',
              description: 'Mô tả M',
              date_time: '2099-04-20T08:00:00.000Z',
              location: 'Hall M',
              teacher_name: 'Teacher M',
              participant_count: 5,
              max_participants: 20,
              status: 'published',
              is_registered: true,
              participation_source: 'assigned',
              is_mandatory: true,
              can_cancel: false,
              applies_to_student: true,
              applicability_reason: 'Áp dụng vì lớp của bạn nằm trong phạm vi hoạt động.',
              activity_type: 'Tình nguyện',
              organization_level: 'Cấp trường',
            },
          ],
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    render(React.createElement(StudentActivitiesPage));

    await screen.findByText('Hoạt động bắt buộc');
    expect(screen.getAllByText('Bắt buộc tham gia').length).toBeGreaterThan(0);
  });
});
