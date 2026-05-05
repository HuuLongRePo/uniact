import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const router = {
  push: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/student/awards/upcoming',
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 10, role: 'student' }, loading: false }),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('UpcomingAwardsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(async () => {
      return {
        ok: true,
        json: async () => ({
          data: {
            awards: [
              {
                type: 'Giải Khá',
                points_needed: 300,
                current_points: 240,
                progress: 80,
                description: 'Dành cho học viên có tổng điểm rèn luyện từ 300 trở lên.',
              },
            ],
          },
        }),
      } as Response;
    }) as typeof fetch;
  });

  it('renders upcoming award milestones from canonical payload', async () => {
    const Page = (await import('../src/app/student/awards/upcoming/page')).default;
    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText('Mốc khen thưởng sắp đạt')).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: /Xem chi tiết điểm/i })).toHaveAttribute(
      'href',
      '/student/points'
    );
    expect(screen.getByRole('link', { name: /Về trang khen thưởng/i })).toHaveAttribute(
      'href',
      '/student/awards'
    );
    expect(screen.getAllByText('Giải Khá')).toHaveLength(2);
    expect(screen.getAllByText('60')).toHaveLength(2);
    expect(screen.getByText('80% hoàn thành')).toBeInTheDocument();
  });
});
