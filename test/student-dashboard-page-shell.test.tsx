import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';

const pushMock = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/student/dashboard',
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function createAuthState(user: User | null, loading = false) {
  return {
    user,
    loading,
    login: vi.fn(async () => undefined),
    logout: vi.fn(async () => undefined),
    register: vi.fn(async () => undefined),
  };
}

describe('StudentDashboardPage shell', () => {
  beforeEach(() => {
    pushMock.mockReset();
    vi.mocked(useAuth).mockReturnValue(createAuthState({ id: 11, role: 'student', name: 'Học viên A' } as User));
    const now = Date.now();

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/student/statistics') {
        return {
          ok: true,
          json: async () => ({
            statistics: {
              registeredActivities: 4,
              attendedActivities: 3,
              totalScore: 78,
              recentScore: 9,
              pendingActivities: 1,
              notifications: 2,
              rank: 3,
              totalStudents: 40,
            },
          }),
        } as Response;
      }
      if (url === '/api/activities?limit=20') {
        return {
          ok: true,
          json: async () => ({
            activities: [
              {
                id: 901,
                title: 'Hoạt động tương lai',
                description: 'Được giữ lại',
                date_time: new Date(now + 86400000).toISOString(),
                location: 'Hội trường',
                activity_type: 'Kỹ năng',
              },
              {
                id: 902,
                title: 'Hoạt động đã qua',
                description: 'Bị lọc',
                date_time: new Date(now - 86400000).toISOString(),
                location: 'Sân trường',
                activity_type: 'Thể thao',
              },
            ],
          }),
        } as Response;
      }
      if (url === '/api/student/scores?limit=5') {
        return {
          ok: true,
          json: async () => ({
            scores: [{ activity_title: 'Điểm mẫu', score: 10, created_at: new Date(now).toISOString() }],
          }),
        } as Response;
      }
      if (url === '/api/notifications?limit=5') {
        return {
          ok: true,
          json: async () => ({
            notifications: [{ title: 'Thông báo mẫu', message: 'Nội dung', created_at: new Date(now).toISOString() }],
          }),
        } as Response;
      }
      if (url === '/api/student/activity-breakdown') {
        return {
          ok: true,
          json: async () => ({
            breakdown: [{ name: 'Kỹ năng', count: 2 }],
            monthly: [{ month: 4, year: 2026, count: 2 }],
          }),
        } as Response;
      }
      if (url === '/api/student/recommendations') {
        return {
          ok: true,
          json: async () => ({
            recommendations: [
              {
                id: 700,
                title: 'Đề xuất mẫu',
                description: 'Đề xuất',
                date_time: new Date(now + 43200000).toISOString(),
                activity_type_name: 'Kỹ năng',
                base_points: 8,
                is_preferred_type: true,
              },
            ],
          }),
        } as Response;
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;
  });

  it('renders prioritized quick actions and future-only upcoming activity list', async () => {
    const Page = (await import('../src/app/student/dashboard/page')).default;
    const { container } = render(<Page />);

    expect(await screen.findByText(/Hành động nhanh/i)).toBeInTheDocument();
    const checkinCta = container.querySelector('a[href="/student/check-in"]');
    const discoverCta = container.querySelector('a[href="/student/activities"]');
    expect(Boolean(checkinCta || discoverCta)).toBe(true);
    expect(container.querySelector('a[href="/student/notifications"]')).toBeTruthy();
    expect(screen.getByText(/#\s*3\s*\/\s*40/)).toBeInTheDocument();
    expect(screen.getByText(/Hoạt động tương lai/i)).toBeInTheDocument();
    expect(screen.queryByText(/Hoạt động đã qua/i)).toBeNull();
    expect(Boolean(checkinCta || discoverCta)).toBe(true);
  });

  it('redirects to login when user is missing', async () => {
    vi.mocked(useAuth).mockReturnValue(createAuthState(null));
    const Page = (await import('../src/app/student/dashboard/page')).default;
    render(<Page />);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/login');
    });
  });
});
