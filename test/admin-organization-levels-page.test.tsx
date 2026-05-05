import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

vi.mock('@/components/ui/ConfirmDialog', () => ({
  ConfirmDialog: () => null,
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

describe('Admin organization levels page', () => {
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

  it('renders organization levels with clean text', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        organization_levels: [
          {
            id: 1,
            name: 'Cap truong',
            multiplier: 2,
            description: 'Hoat dong quy mo toan truong',
            created_at: '2026-05-01T08:00:00.000Z',
          },
        ],
      }),
    }));

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/features/organization-levels/OrganizationLevelsAdminPage'))
      .default;
    const { container } = render(<Page />);

    expect(await screen.findByTestId('admin-organization-levels-heading')).toHaveTextContent(
      'Cau hinh cap do to chuc'
    );
    expect(screen.getAllByText('Cap truong').length).toBeGreaterThan(0);
    expectNoMojibake(container.textContent || '');
  });

  it('creates a new organization level', async () => {
    let created = false;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
      const url = String(input);
      if (url === '/api/organization-levels' && options?.method === 'POST') {
        created = true;
        return { ok: true, json: async () => ({ message: 'created' }) };
      }

      if (url === '/api/organization-levels') {
        return {
          ok: true,
          json: async () => ({
            organization_levels: created
              ? [
                  {
                    id: 1,
                    name: 'Cap khoa',
                    multiplier: 1.4,
                    description: 'Su kien cap khoa',
                    created_at: '2026-05-01T08:00:00.000Z',
                  },
                ]
              : [],
          }),
        };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/features/organization-levels/OrganizationLevelsAdminPage'))
      .default;
    render(<Page />);

    expect(await screen.findByTestId('admin-organization-levels-heading')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Them cap do' }));
    expect(
      await screen.findByRole('dialog', { name: 'Them cap do to chuc' })
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Ten cap do'), {
      target: { value: 'Cap khoa' },
    });
    fireEvent.change(screen.getByLabelText('He so nhan'), {
      target: { value: '1.4' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tao cap do moi' }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Da tao cap do to chuc moi');
    });
    expect(screen.getAllByText('Cap khoa').length).toBeGreaterThan(0);
  });

  it('redirects non-admin users to login', async () => {
    vi.mocked(useAuth).mockReturnValue(createAuthState('teacher'));

    const Page = (await import('../src/features/organization-levels/OrganizationLevelsAdminPage'))
      .default;
    render(<Page />);

    expect(pushMock).toHaveBeenCalledWith('/login');
  });
});
