import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { User } from '@/types/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminReportsIndexPage from '@/app/admin/reports/page';
import { useAuth } from '@/contexts/AuthContext';

const { pushMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
}));

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
}));

vi.mock('@/components/LoadingSpinner', () => ({
  default: ({ message }: { message?: string }) => <div>{message || 'Loading'}</div>,
}));

function createAuthState(role: string = 'admin') {
  return {
    user: { id: 1, role } as User,
    loading: false,
    login: vi.fn(async () => undefined),
    logout: vi.fn(async () => undefined),
    register: vi.fn(async () => undefined),
  };
}

describe('Admin reports index page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(createAuthState());
  });

  it('shows report hub cards for admins', () => {
    render(<AdminReportsIndexPage />);

    expect(screen.getByRole('heading', { name: 'Bao cao quan tri' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Bao cao diem so/i })).toHaveAttribute(
      'href',
      '/admin/reports/scores'
    );
    expect(screen.getByRole('link', { name: /Thong ke hoat dong/i })).toHaveAttribute(
      'href',
      '/admin/reports/activity-statistics'
    );
    expect(screen.getByRole('link', { name: /Bao cao tuy chinh/i })).toHaveAttribute(
      'href',
      '/admin/reports/custom'
    );
  });

  it('redirects non-admin users away from the reports hub', async () => {
    vi.mocked(useAuth).mockReturnValue({
      ...createAuthState('teacher'),
      user: { id: 2, role: 'teacher' } as User,
    } as any);

    render(<AdminReportsIndexPage />);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/login');
    });
  });
});
