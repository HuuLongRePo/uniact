import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const pushMock = vi.fn();

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/lib/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/components/ActivityDialog', () => ({
  default: ({ isOpen }: any) => (isOpen ? <div>Activity dialog</div> : null),
}));

vi.mock('@/components/LoadingSpinner', () => ({
  default: () => <div>Loading...</div>,
}));

vi.mock('@/components/ActivitySkeleton', () => ({
  default: () => <div>Loading skeleton...</div>,
}));

vi.mock('@/components/EmptyState', () => ({
  default: ({ title, message }: any) => (
    <div>
      <div>{title}</div>
      <div>{message}</div>
    </div>
  ),
}));

vi.mock('@/components/ui/ConfirmDialog', () => ({
  ConfirmDialog: ({ isOpen, title, message, onConfirm }: any) =>
    isOpen ? (
      <div>
        <div>{title}</div>
        <div>{message}</div>
        <button onClick={onConfirm}>Confirm action</button>
      </div>
    ) : null,
}));

describe('TeacherActivitiesPage', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('reads canonical nested payload from /api/activities for teacher-owned list', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.startsWith('/api/activities?')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              activities: [
                {
                  id: 7,
                  title: 'Sinh hoạt công dân',
                  description: 'Hoạt động đầu năm',
                  date_time: '2026-04-21T08:00:00.000Z',
                  location: 'Hội trường A',
                  max_participants: 100,
                  status: 'draft',
                  participant_count: 12,
                  attended_count: 0,
                  teacher_name: 'Teacher A',
                },
              ],
              total: 1,
            },
          }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const { default: TeacherActivitiesPage } = await import('../src/app/teacher/activities/page');
    render(<TeacherActivitiesPage />);

    expect(await screen.findByText('Sinh hoạt công dân')).toBeInTheDocument();
    expect(screen.getByText('Teacher A')).toBeInTheDocument();
    expect(screen.getByText('12/100')).toBeInTheDocument();
  });

  it('surfaces upcoming published activities in a dedicated section above the main list', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.startsWith('/api/activities?')) {
        return {
          ok: true,
          json: async () => ({
            activities: [
              {
                id: 21,
                title: 'Hoạt động sắp diễn ra',
                description: 'Chuẩn bị bắt đầu',
                date_time: '2099-04-21T08:00:00.000Z',
                location: 'Hội trường B',
                max_participants: 50,
                status: 'published',
                participant_count: 20,
                attended_count: 0,
              },
              {
                id: 22,
                title: 'Hoạt động nháp',
                description: 'Chưa gửi duyệt',
                date_time: '2099-04-22T08:00:00.000Z',
                location: 'Phòng 101',
                max_participants: 40,
                status: 'draft',
                participant_count: 0,
                attended_count: 0,
              },
              {
                id: 23,
                title: 'Hoạt động đã qua hạn',
                description: 'Đã diễn ra xong nhưng chưa đánh dấu hoàn thành',
                date_time: '2020-04-21T08:00:00.000Z',
                location: 'Sân trường',
                max_participants: 30,
                status: 'published',
                participant_count: 18,
                attended_count: 15,
              },
            ],
            total: 2,
          }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const { default: TeacherActivitiesPage } = await import('../src/app/teacher/activities/page');
    render(<TeacherActivitiesPage />);

    expect(await screen.findByText('Sắp diễn ra')).toBeInTheDocument();
    expect(screen.getByText('Hoạt động sắp diễn ra')).toBeInTheDocument();
    expect(screen.getByText('Đã qua hoặc đã khép lại')).toBeInTheDocument();
    expect(screen.getByText('Hoạt động đã qua hạn')).toBeInTheDocument();
    expect(screen.getByText('Hoạt động nháp')).toBeInTheDocument();
  });

  it('uses API message for submit approval success toast', async () => {
    const { toast } = await import('@/lib/toast');

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.startsWith('/api/activities?')) {
        return {
          ok: true,
          json: async () => ({
            activities: [
              {
                id: 11,
                title: 'Hoạt động nháp',
                description: 'Mô tả',
                date_time: '2099-04-21T08:00:00.000Z',
                location: 'Phòng 101',
                max_participants: 40,
                status: 'draft',
                participant_count: 0,
                attended_count: 0,
              },
            ],
            total: 1,
          }),
        } as Response;
      }

      if (url === '/api/activities/11/submit-approval' && init?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({ message: 'Đã gửi duyệt hoạt động lên ban quản trị' }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const { default: TeacherActivitiesPage } = await import('../src/app/teacher/activities/page');
    render(<TeacherActivitiesPage />);

    expect(await screen.findByText('Hoạt động nháp')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Gửi duyệt'));
    fireEvent.click(await screen.findByText('Confirm action'));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Đã gửi duyệt hoạt động lên ban quản trị');
    });
  });
});
