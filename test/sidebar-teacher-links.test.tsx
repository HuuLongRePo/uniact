import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
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

function routeExists(href: string) {
  const base = path.join(process.cwd(), 'src', 'app', ...href.split('/').filter(Boolean));
  return (
    fs.existsSync(path.join(base, 'page.tsx')) ||
    fs.existsSync(path.join(base, 'page.ts')) ||
    fs.existsSync(path.join(base, 'route.ts')) ||
    fs.existsSync(path.join(base, 'route.tsx'))
  );
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
    expect(container.querySelector('a[href="/teacher/notifications/history"]')).toBeTruthy();
    expect(container.querySelector('a[href="/teacher/notifications/settings"]')).toBeTruthy();
    expect(container.querySelector('a[href="/teacher/notifications/broadcast"]')).toBeTruthy();
    expect(container.querySelector('a[href="/teacher/reports/class-stats"]')).toBeTruthy();
    expect(container.querySelector('a[href="/teacher/students/notes"]')).toBeTruthy();
  });

  it('shows student check-in, recommendations and achievement tips routes', async () => {
    vi.mocked(useAuth).mockReturnValue(createAuthState('student'));
    const { container } = render(<Sidebar />);

    await waitFor(() => {
      expect(container.querySelector('a[href="/student/check-in"]')).toBeTruthy();
    });
    expect(container.querySelector('a[href="/student/alerts"]')).toBeTruthy();
    expect(container.querySelector('a[href="/student/recommendations"]')).toBeTruthy();
    expect(container.querySelector('a[href="/student/achievements/tips"]')).toBeTruthy();
    expect(container.querySelector('a[href="/student/awards/history"]')).toBeTruthy();
    expect(container.querySelector('a[href="/student/awards/upcoming"]')).toBeTruthy();
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
    expect(container.querySelector('a[href="/admin/audit-logs"]')).toBeTruthy();
    expect(container.querySelector('a[href="/admin/reports/activity-statistics"]')).toBeTruthy();
    expect(container.querySelector('a[href="/admin/reports/scores"]')).toBeTruthy();
    expect(container.querySelector('a[href="/admin/reports/teachers"]')).toBeTruthy();
  });

  it('prioritizes high-frequency operational routes and keeps every sidebar route resolvable', async () => {
    const assertions: Array<{
      role: 'admin' | 'teacher' | 'student';
      higherPriorityPath: string;
      lowerPriorityPath: string;
    }> = [
      { role: 'admin', higherPriorityPath: '/admin/activities', lowerPriorityPath: '/admin/settings' },
      {
        role: 'teacher',
        higherPriorityPath: '/teacher/attendance',
        lowerPriorityPath: '/teacher/notifications/history',
      },
      {
        role: 'student',
        higherPriorityPath: '/student/check-in',
        lowerPriorityPath: '/student/dashboard',
      },
      {
        role: 'student',
        higherPriorityPath: '/student/notifications',
        lowerPriorityPath: '/student/profile',
      },
      {
        role: 'student',
        higherPriorityPath: '/student/alerts',
        lowerPriorityPath: '/student/recommendations',
      },
      {
        role: 'student',
        higherPriorityPath: '/student/polls',
        lowerPriorityPath: '/student/activities',
      },
    ];

    for (const item of assertions) {
      vi.mocked(useAuth).mockReturnValue(createAuthState(item.role));
      const { container, unmount } = render(<Sidebar />);

      await waitFor(() => {
        expect(container.querySelector(`a[href="${item.higherPriorityPath}"]`)).toBeTruthy();
      });

      const links = Array.from(container.querySelectorAll('a[href^="/"]')).map(
        (anchor) => anchor.getAttribute('href') || ''
      );

      const higherPriorityIndex = links.indexOf(item.higherPriorityPath);
      const lowerPriorityIndex = links.indexOf(item.lowerPriorityPath);

      expect(higherPriorityIndex).toBeGreaterThanOrEqual(0);
      expect(lowerPriorityIndex).toBeGreaterThan(higherPriorityIndex);

      const unresolved = links.filter((href) => !routeExists(href));
      expect(unresolved).toEqual([]);
      unmount();
    }
  });
});
