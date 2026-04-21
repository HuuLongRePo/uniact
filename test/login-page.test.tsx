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
  default: ({ onSelectAccount }: any) => (
    <button
      data-testid="login-test-panel"
      onClick={() => onSelectAccount?.('demo@user.test', 'demo-pass')}
    >
      Demo Panel
    </button>
  ),
}));

describe('Login page demo panel gating', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('shows explanatory notice when demo panel is disabled in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS', '0');
    vi.stubEnv('ENABLE_DEMO_ACCOUNTS', '0');

    const Page = (await import('../src/app/login/page')).default;
    render(<Page />);

    expect(
      screen.getByText(/Demo account panel hiện chỉ hiển thị khi bạn bật/i)
    ).toBeInTheDocument();
    expect(screen.queryByTestId('login-test-panel')).not.toBeInTheDocument();
  });

  it('shows demo panel in production when NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS is enabled', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS', '1');

    const Page = (await import('../src/app/login/page')).default;
    render(<Page />);

    expect(screen.getByTestId('login-test-panel')).toBeInTheDocument();
    expect(screen.queryByText(/Demo account panel hiện chỉ hiển thị/i)).not.toBeInTheDocument();
  });

  it('shows demo panel in development by default', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS', '0');
    vi.stubEnv('ENABLE_DEMO_ACCOUNTS', '0');

    const Page = (await import('../src/app/login/page')).default;
    render(<Page />);

    expect(screen.getByTestId('login-test-panel')).toBeInTheDocument();
  });
});
