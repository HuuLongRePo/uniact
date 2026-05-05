import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const router = {
  push: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/student/profile',
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

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 7, role: 'student' }, loading: false }),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('StudentProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(async () => {
      return {
        ok: true,
        json: async () => ({
          data: {
            user: {
              id: 7,
              email: 'student@example.com',
              name: 'Nguyễn Văn A',
              role: 'student',
              class_name: 'CTK45A',
              activity_count: 12,
              total_points: 245,
              created_at: '2026-04-20T10:00:00.000Z',
              gender: 'nam',
            },
          },
        }),
      } as Response;
    }) as typeof fetch;
  });

  it('renders canonical profile payload and quick actions', async () => {
    const Page = (await import('../src/app/student/profile/page')).default;
    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText('Hồ sơ cá nhân')).toBeInTheDocument();
    });

    expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.getAllByText('student@example.com')).toHaveLength(2);
    expect(screen.getAllByText('CTK45A')).toHaveLength(2);
    expect(screen.getByText('245')).toBeInTheDocument();

    const quickActionLinks = screen
      .getAllByTestId('student-daily-quick-action-link')
      .map((link) => link.getAttribute('href'));
    expect(quickActionLinks).toEqual(
      expect.arrayContaining([
        '/student/check-in',
        '/student/my-activities',
        '/student/notifications',
        '/student/alerts',
        '/student/scores',
        '/student/dashboard',
        '/student/devices',
      ])
    );

    fireEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));
    expect(await screen.findByRole('dialog', { name: 'Đổi mật khẩu' })).toBeInTheDocument();
  });
});
