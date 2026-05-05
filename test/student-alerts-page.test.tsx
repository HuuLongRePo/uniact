import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StudentAlertsPage from '@/app/student/alerts/page';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 5, role: 'student' }, loading: false }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/student/alerts',
}));

vi.mock('@/components/LoadingSpinner', () => ({
  default: () => <div data-testid="loading-spinner">Loading</div>,
}));

describe('StudentAlertsPage', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads canonical alerts payload and renders summary cards', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: {
          alerts: [
            {
              id: 1,
              type: 'deadline',
              title: 'Sắp đến hạn nộp minh chứng',
              message: 'Cần hoàn tất nộp minh chứng trước 18:00.',
              severity: 'warning',
              created_at: '2026-04-28T10:00:00.000Z',
            },
          ],
        },
      }),
    }));

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    render(<StudentAlertsPage />);

    expect(await screen.findByText('Cảnh báo và nhắc nhở')).toBeInTheDocument();
    expect(screen.getByText('Sắp đến hạn nộp minh chứng')).toBeInTheDocument();
    expect(screen.getByText('Cần xử lý sớm')).toBeInTheDocument();
    expect(screen.getByText('Tổng cảnh báo')).toBeInTheDocument();
    expect(screen.getByText('Tác vụ nhanh')).toBeInTheDocument();
  });

  it('shows empty state when there are no alerts', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ alerts: [] }),
    }));

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    render(<StudentAlertsPage />);

    expect(await screen.findByText('Không có cảnh báo nào')).toBeInTheDocument();
    expect(screen.getByText('Hiện tại không có mục nào cần học viên xử lý thêm.')).toBeInTheDocument();
  });
});
