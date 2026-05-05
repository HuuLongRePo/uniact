import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const router = {
  push: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/student/awards/history',
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: any; [key: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 9, role: 'student' }, loading: false }),
}));

describe('Student award history page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(async () => {
      return {
        ok: true,
        json: async () => ({
          data: {
            awards: [
              {
                id: 1,
                awardName: 'Sinh viên xuất sắc',
                awardedAt: '2026-04-20T20:00:00.000Z',
                points: 20,
                reason: 'Hoàn thành xuất sắc',
                activityTitle: 'Hội thảo học thuật',
              },
            ],
            totalPoints: 20,
          },
        }),
      } as Response;
    }) as typeof fetch;
  });

  it('renders canonical payload and formats date in Vietnam timezone', async () => {
    const Page = (await import('../src/app/student/awards/history/page')).default;
    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText('Sinh viên xuất sắc')).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: /Về trang khen thưởng/i })).toHaveAttribute(
      'href',
      '/student/awards'
    );
    expect(screen.getByRole('link', { name: /Về trang chủ/i })).toHaveAttribute(
      'href',
      '/student/dashboard'
    );
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getAllByText('21/04/2026')).toHaveLength(2);
    expect(screen.getByText(/Hoạt động liên quan/i)).toBeInTheDocument();
  });
});
