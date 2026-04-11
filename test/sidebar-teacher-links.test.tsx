import React from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/contexts/AuthContext';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/teacher/dashboard',
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={typeof href === 'string' ? href : String(href)} {...props}>
      {children}
    </a>
  ),
}));

function createAuthState() {
  return {
    user: { id: 7, role: 'teacher', name: 'Teacher One' },
    loading: false,
    login: vi.fn(async () => undefined),
    logout: vi.fn(async () => undefined),
    register: vi.fn(async () => undefined),
  };
}

describe('Sidebar teacher navigation', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(createAuthState() as any);
  });

  it('links teacher class management to the canonical teacher route', () => {
    const { container } = render(<Sidebar />);

    expect(container.querySelector('a[href="/teacher/classes"]')).toBeTruthy();
    expect(container.querySelector('a[href="/classes"]')).toBeNull();
  });
});
