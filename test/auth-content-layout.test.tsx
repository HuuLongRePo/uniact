import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/contexts/AuthContext';

const pathnameState = vi.hoisted(() => ({ value: '/admin/dashboard' }));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameState.value,
}));

vi.mock('@/components/Sidebar', () => ({
  default: () => <div data-testid="mock-sidebar">Sidebar</div>,
}));

vi.mock('@/components/LoadingSpinner', () => ({
  default: () => <div data-testid="mock-loading">Loading</div>,
}));

vi.mock('@/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/realtime/RealtimeNotificationBridge', () => ({
  RealtimeNotificationBridge: () => <div data-testid="mock-realtime">Realtime</div>,
}));

describe('AuthContent layout shell', () => {
  beforeEach(() => {
    pathnameState.value = '/admin/dashboard';
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, role: 'admin', name: 'Admin', email: 'admin@uniact.local' } as any,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
    });
  });

  it('renders sidebar-aware shell on protected routes', async () => {
    const AuthContent = (await import('../src/components/AuthContent')).default;
    render(<AuthContent><div>Protected page</div></AuthContent>);

    expect(screen.getByTestId('mock-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('mock-realtime')).toBeInTheDocument();
    expect(screen.getByTestId('app-shell-main')).toHaveClass('app-shell-with-sidebar');
    expect(screen.getByText('Protected page')).toBeInTheDocument();
  });

  it('does not render sidebar on public routes', async () => {
    pathnameState.value = '/login';

    const AuthContent = (await import('../src/components/AuthContent')).default;
    const { container } = render(<AuthContent><div>Login page</div></AuthContent>);

    expect(container.querySelector('[data-testid="mock-sidebar"]')).toBeNull();
    expect(screen.getByTestId('app-shell-main')).not.toHaveClass('app-shell-with-sidebar');
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });
});
