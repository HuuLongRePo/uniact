import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Sidebar from '@/components/Sidebar';
import { useAuth, type AuthContextType } from '@/contexts/AuthContext';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/teacher/dashboard',
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
    <a href={typeof href === 'string' ? href : String(href)} {...props}>
      {children}
    </a>
  ),
}));

function createAuthState(role: 'admin' | 'teacher' | 'student'): AuthContextType {
  return {
    user: {
      id: 7,
      role,
      name: `${role} user`,
      email: `${role}@uniact.local`,
    },
    loading: false,
    login: vi.fn(async () => undefined),
    logout: vi.fn(async () => undefined),
    register: vi.fn(async () => undefined),
  };
}

describe('Sidebar navigation coverage', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(createAuthState('teacher'));
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ meta: { total_unread: 3 } }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;
  });

  it('links teacher class management to the canonical teacher route', async () => {
    vi.mocked(useAuth).mockReturnValue(createAuthState('teacher'));
    const { container } = render(<Sidebar />);

    await waitFor(() => {
      expect(container.querySelector('a[href="/teacher/classes"]')).toBeTruthy();
    });
    expect(container.querySelector('a[href="/classes"]')).toBeNull();
  });

  it('shows teacher report and biometric routes in navigation', async () => {
    vi.mocked(useAuth).mockReturnValue(createAuthState('teacher'));
    const { container } = render(<Sidebar />);

    await waitFor(() => {
      expect(container.querySelector('a[href="/teacher/reports/attendance"]')).toBeTruthy();
    });
    expect(container.querySelector('a[href="/teacher/reports/participation"]')).toBeTruthy();
    expect(container.querySelector('a[href="/teacher/biometrics"]')).toBeTruthy();
    expect(container.querySelector('a[href="/teacher/bonus-proposal"]')).toBeTruthy();
  });

  it('shows student check-in, recommendations and achievement tips routes', async () => {
    vi.mocked(useAuth).mockReturnValue(createAuthState('student'));
    const { container } = render(<Sidebar />);

    await waitFor(() => {
      expect(container.querySelector('a[href="/student/check-in"]')).toBeTruthy();
    });
    expect(container.querySelector('a[href="/student/recommendations"]')).toBeTruthy();
    expect(container.querySelector('a[href="/student/achievements/tips"]')).toBeTruthy();
    expect(screen.getByText('Quét QR điểm danh')).toBeInTheDocument();
  });

  it('shows direct admin entry points for templates, teachers and students', async () => {
    vi.mocked(useAuth).mockReturnValue(createAuthState('admin'));
    const { container } = render(<Sidebar />);

    await waitFor(() => {
      expect(container.querySelector('a[href="/admin/activity-templates"]')).toBeTruthy();
    });
    expect(container.querySelector('a[href="/admin/teachers"]')).toBeTruthy();
    expect(container.querySelector('a[href="/admin/students"]')).toBeTruthy();
    expect(container.querySelector('a[href="/admin/biometrics"]')).toBeTruthy();
  });
});
