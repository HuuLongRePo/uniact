import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RecommendationsPage from '@/app/student/recommendations/page';

const pushMock = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 5, role: 'student' }, loading: false }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/student/recommendations',
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

describe('RecommendationsPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('renders recommendations from nested payload and navigates to activity detail', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: {
          recommendations: [
            {
              id: 17,
              title: 'Hội thảo kỹ năng mềm',
              date_time: '2026-05-15T08:00:00.000Z',
              location: 'Hội trường B',
              activity_type_name: 'Kỹ năng',
              match_reason: 'Phù hợp với nhóm hoạt động bạn tham gia gần đây.',
            },
          ],
        },
      }),
    }));

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    render(<RecommendationsPage />);

    expect(await screen.findByText('Gợi ý hoạt động')).toBeInTheDocument();
    expect(screen.getByText('Hội thảo kỹ năng mềm')).toBeInTheDocument();
    expect(screen.getByText('Phù hợp với nhóm hoạt động bạn tham gia gần đây.')).toBeInTheDocument();
    expect(screen.getByText('Tác vụ nhanh')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Xem hoạt động' })).toHaveAttribute(
      'href',
      '/student/activities/17'
    );
  });

  it('shows empty state when there are no recommendations', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ recommendations: [] }),
    }));

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    render(<RecommendationsPage />);

    expect(await screen.findByText('Chưa có gợi ý nào')).toBeInTheDocument();
    expect(screen.getByText('Sau khi học viên tham gia thêm hoạt động, hệ thống sẽ đề xuất sát hơn.')).toBeInTheDocument();
  });
});
