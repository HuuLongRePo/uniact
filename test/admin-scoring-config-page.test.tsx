import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/contexts/AuthContext';
import type { User } from '@/types/database';
import { expectNoMojibake } from './helpers/mojibake';

const { pushMock, routerMock, toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  routerMock: { push: vi.fn() },
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
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

vi.mock('@/components/LoadingSpinner', () => ({
  default: ({ message }: { message?: string }) => <div>{message || 'Loading'}</div>,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
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

function createScoringConfigPayload() {
  return {
    scoringRules: [{ id: 1, name: 'Mac dinh', formula: 'base * level', description: 'Rule', is_active: 1 }],
    activityTypes: [{ id: 1, name: 'Tinh nguyen', base_points: 10, color: '#3B82F6' }],
    organizationLevels: [{ id: 2, name: 'Cap truong', multiplier: 2 }],
    achievementMultipliers: [{ achievement_level: 'excellent', multiplier: 1.5, description: 'Xuat sac' }],
    awardBonuses: [{ id: 1, award_type: 'first', name: 'Giai nhat', bonus_points: 20, description: 'Thuong them' }],
    systemConfig: [],
  };
}

describe('Admin scoring config page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(useAuth).mockReturnValue(createAuthState());
    pushMock.mockReset();
    routerMock.push = pushMock;
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders scoring config overview with clean text', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => createScoringConfigPayload(),
    }));

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/scoring-config/page')).default;
    const { container } = render(<Page />);

    expect(await screen.findByTestId('admin-scoring-config-heading')).toHaveTextContent(
      'Dieu phoi cong thuc tinh diem'
    );
    expect(screen.getByText('Loai hoat dong (1)')).toBeInTheDocument();
    expect(screen.getByText('Cap to chuc (1)')).toBeInTheDocument();
    expectNoMojibake(container.textContent || '');
  });

  it('opens formula editor from scoring config', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => createScoringConfigPayload(),
    }));

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/scoring-config/page')).default;
    render(<Page />);

    expect(await screen.findByTestId('admin-scoring-config-heading')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mo formula editor' }));
    expect(pushMock).toHaveBeenCalledWith('/admin/scoring-config/formula-editor');
  });

  it('redirects non-admin users to login', async () => {
    vi.mocked(useAuth).mockReturnValue(createAuthState('teacher'));

    const Page = (await import('../src/app/admin/scoring-config/page')).default;
    render(<Page />);

    expect(pushMock).toHaveBeenCalledWith('/login');
  });
});
