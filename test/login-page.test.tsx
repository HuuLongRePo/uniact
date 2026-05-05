import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  login: vi.fn(),
}));

const state = vi.hoisted(() => ({
  user: null as any,
  query: '',
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => new URLSearchParams(state.query),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: state.user, login: mocks.login }),
}));

vi.mock('@/lib/use-submit-hook', () => ({
  useSubmit: (fn: any) => ({
    handleSubmit: fn,
    state: {
      isDisabled: false,
      buttonClass: '',
      buttonText: 'Dang nhap',
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
    state.user = null;
    state.query = '';
  });

  it('shows explanatory notice when demo panel is disabled in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS', '0');
    vi.stubEnv('ENABLE_DEMO_ACCOUNTS', '0');

    const Page = (await import('../src/app/login/page')).default;
    render(<Page />);

    expect(screen.getByText(/demo account panel chi hien thi khi bat/i)).toBeInTheDocument();
    expect(screen.queryByTestId('login-test-panel')).not.toBeInTheDocument();
  });

  it('shows demo panel in production when NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS is enabled', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS', '1');

    const Page = (await import('../src/app/login/page')).default;
    render(<Page />);

    expect(screen.getByTestId('login-test-panel')).toBeInTheDocument();
    expect(screen.queryByText(/demo account panel chi hien thi/i)).not.toBeInTheDocument();
  });

  it('shows demo panel in development by default', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS', '0');
    vi.stubEnv('ENABLE_DEMO_ACCOUNTS', '0');

    const Page = (await import('../src/app/login/page')).default;
    render(<Page />);

    expect(screen.getByTestId('login-test-panel')).toBeInTheDocument();
  });

  it('redirects logged-in user back to redirect target and preserves qr params', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    state.user = { id: 7, role: 'student', email: 'sv31a001@annd.edu.vn' };
    state.query = 'redirect=%2Fstudent%2Fcheck-in&s=19&t=abc-token';

    const Page = (await import('../src/app/login/page')).default;
    render(<Page />);

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith('/student/check-in?s=19&t=abc-token');
    });
  });
});
