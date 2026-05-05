import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const router = {
  push: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/student/awards',
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 8, role: 'student' }, loading: false }),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('StudentAwardsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(async () => {
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: {
            awards: [
              {
                id: 1,
                award_type_name: 'Sinh viên xuất sắc',
                award_type_description: 'Ghi nhận thành tích nổi bật',
                reason: 'Hoàn thành xuất sắc học kỳ',
                awarded_at: '2026-04-10T10:00:00.000Z',
                awarded_by_name: 'Cố vấn học tập',
              },
            ],
            summary: [
              {
                award_type_name: 'Sinh viên xuất sắc',
                total_awards: 1,
                first_awarded_at: '2026-04-10T10:00:00.000Z',
                last_awarded_at: '2026-04-10T10:00:00.000Z',
              },
            ],
          },
        }),
      } as Response;
    }) as typeof fetch;
  });

  it('renders canonical awards payload with summary and list', async () => {
    const Page = (await import('../src/app/student/awards/page')).default;
    render(<Page />);

    await waitFor(() => {
      expect(screen.getByTestId('awards-heading')).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: /Xem lịch sử/i })).toHaveAttribute(
      'href',
      '/student/awards/history'
    );
    expect(screen.getByRole('link', { name: /Mốc tiếp theo/i })).toHaveAttribute(
      'href',
      '/student/awards/upcoming'
    );
    expect(screen.getAllByText('Sinh viên xuất sắc')).toHaveLength(2);
    expect(screen.getByText('Hoàn thành xuất sắc học kỳ')).toBeInTheDocument();
    expect(screen.getByText('Cố vấn học tập')).toBeInTheDocument();
  });
});
