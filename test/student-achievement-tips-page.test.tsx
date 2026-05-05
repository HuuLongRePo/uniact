import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@/types/database';
import AchievementTipsPage from '@/app/student/achievements/tips/page';
import { useAuth } from '@/contexts/AuthContext';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/student/achievements/tips',
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

vi.mock('@/components/LoadingSpinner', () => ({
  default: () => <div data-testid="loading-spinner">Loading</div>,
}));

function createAuthState(role: string = 'student') {
  return {
    user: { id: 1, role } as User,
    loading: false,
    login: vi.fn(async () => undefined),
    logout: vi.fn(async () => undefined),
    register: vi.fn(async () => undefined),
  };
}

describe('AchievementTipsPage', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(createAuthState());
  });

  it('uses canonical student endpoints and routes', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === '/api/student/statistics') {
        return {
          ok: true,
          json: async () => ({
            statistics: {
              registeredActivities: 4,
              attendedActivities: 3,
              totalScore: 42,
            },
          }),
        };
      }

      if (url === '/api/student/awards/upcoming') {
        return {
          ok: true,
          json: async () => ({
            awards: [
              {
                type: 'Hoc vien tich cuc',
                points_needed: 50,
                current_points: 42,
                progress: 84,
                description: 'Con thieu it diem nua',
              },
            ],
          }),
        };
      }

      if (url === '/api/student/history') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              history: [
                { attended: 1, date_time: new Date().toISOString() },
                { attended: 1, date_time: new Date().toISOString() },
              ],
            },
          }),
        };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    render(<AchievementTipsPage />);

    expect(await screen.findByText('Mẹo thành tích')).toBeInTheDocument();
    expect(screen.getByTestId('student-daily-quick-actions')).toBeInTheDocument();
    expect(screen.getByText('Tổng điểm hiện tại')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Xem hoạt động của tôi' })).toHaveAttribute(
      'href',
      '/student/my-activities'
    );

    const calledUrls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(calledUrls).toContain('/api/student/statistics');
    expect(calledUrls).toContain('/api/student/awards/upcoming');
    expect(calledUrls).toContain('/api/student/history');
    expect(calledUrls).not.toContain('/api/student/stats');
  });
});
