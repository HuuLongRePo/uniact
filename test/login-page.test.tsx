import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  login: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, login: mocks.login }),
}));

vi.mock('@/lib/use-submit-hook', () => ({
  useSubmit: (fn: any) => ({
    handleSubmit: fn,
    state: {
      isDisabled: false,
      buttonClass: '',
      buttonText: 'Đăng nhập',
    },
  }),
}));

vi.mock('@/components/LoginTestPanel', () => ({
  default: () => <div data-testid="login-test-panel">Demo Panel</div>,
}));

describe('Login page demo panel gating', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('shows explanatory notice when demo panel is disabled', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS', '0');

    const Page = (await import('../src/app/login/page')).default;
    render(<Page />);

    expect(screen.getByText(/Quick login đang tắt/i)).toBeInTheDocument();
    expect(screen.queryByTestId('login-test-panel')).not.toBeInTheDocument();
  });

  it('shows demo panel when demo accounts are enabled even in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS', '1');

    const Page = (await import('../src/app/login/page')).default;
    render(<Page />);

    expect(screen.getByTestId('login-test-panel')).toBeInTheDocument();
    expect(screen.queryByText(/Quick login đang tắt/i)).not.toBeInTheDocument();
  });
});
