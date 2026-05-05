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

describe('Admin activity types page', () => {
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

  it('renders activity types with clean text', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        activityTypes: [
          {
            id: 1,
            name: 'Tinh nguyen',
            base_points: 12,
            color: '#22C55E',
            created_at: '2026-05-01T08:00:00.000Z',
          },
        ],
      }),
    }));

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/features/activity-types/ActivityTypesAdminPage')).default;
    const { container } = render(<Page />);

    expect(await screen.findByTestId('admin-activity-types-heading')).toHaveTextContent(
      'Cau hinh loai hoat dong'
    );
    expect(screen.getAllByText('Tinh nguyen').length).toBeGreaterThan(0);
    expectNoMojibake(container.textContent || '');
  });

  it('creates a new activity type', async () => {
    let created = false;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
      const url = String(input);
      if (url === '/api/activity-types' && options?.method === 'POST') {
        created = true;
        return { ok: true, json: async () => ({ message: 'created' }) };
      }

      if (url === '/api/activity-types') {
        return {
          ok: true,
          json: async () => ({
            activityTypes: created
              ? [
                  {
                    id: 1,
                    name: 'Ky nang',
                    base_points: 15,
                    color: '#3B82F6',
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

    const Page = (await import('../src/features/activity-types/ActivityTypesAdminPage')).default;
    render(<Page />);

    expect(await screen.findByTestId('admin-activity-types-heading')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Them loai hoat dong' }));
    expect(await screen.findByRole('dialog', { name: 'Them loai hoat dong' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Ten loai hoat dong'), {
      target: { value: 'Ky nang' },
    });
    fireEvent.change(screen.getByLabelText('Diem co ban'), {
      target: { value: '15' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tao loai moi' }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Da tao loai hoat dong moi');
    });
    expect(screen.getAllByText('Ky nang').length).toBeGreaterThan(0);
  });

  it('redirects non-admin users to login', async () => {
    vi.mocked(useAuth).mockReturnValue(createAuthState('teacher'));

    const Page = (await import('../src/features/activity-types/ActivityTypesAdminPage')).default;
    render(<Page />);

    expect(pushMock).toHaveBeenCalledWith('/login');
  });
});
