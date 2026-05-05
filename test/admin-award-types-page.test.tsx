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

describe('Admin award types page', () => {
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

  it('renders award types with clean text', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            id: 2,
            name: 'Sinh vien 5 tot',
            description: 'Danh hieu tong hop cap truong',
            min_points: 250,
            award_count: 4,
            created_at: '2026-05-01T08:00:00.000Z',
          },
        ],
      }),
    }));

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/features/award-types/AwardTypesAdminPage')).default;
    const { container } = render(<Page />);

    expect(await screen.findByTestId('admin-award-types-heading')).toHaveTextContent(
      'Cau hinh loai danh hieu'
    );
    expect(screen.getAllByText('Sinh vien 5 tot').length).toBeGreaterThan(0);
    expectNoMojibake(container.textContent || '');
  });

  it('updates an existing award type', async () => {
    let updated = false;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
      const url = String(input);
      if (url === '/api/admin/award-types/2' && options?.method === 'PUT') {
        updated = true;
        return { ok: true, json: async () => ({ success: true }) };
      }

      if (url === '/api/admin/award-types') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                id: 2,
                name: updated ? 'Sinh vien xuat sac' : 'Sinh vien 5 tot',
                description: 'Danh hieu tong hop cap truong',
                min_points: updated ? 280 : 250,
                award_count: 4,
                created_at: '2026-05-01T08:00:00.000Z',
              },
            ],
          }),
        };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/features/award-types/AwardTypesAdminPage')).default;
    render(<Page />);

    expect(await screen.findByTestId('admin-award-types-heading')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Sua' })[0]);
    expect(
      await screen.findByRole('dialog', { name: 'Cap nhat loai danh hieu' })
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Ten loai danh hieu'), {
      target: { value: 'Sinh vien xuat sac' },
    });
    fireEvent.change(screen.getByLabelText('Diem toi thieu'), {
      target: { value: '280' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Luu thay doi' }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Da cap nhat loai danh hieu');
    });
    expect(screen.getAllByText('Sinh vien xuat sac').length).toBeGreaterThan(0);
  });

  it('redirects non-admin users to login', async () => {
    vi.mocked(useAuth).mockReturnValue(createAuthState('teacher'));

    const Page = (await import('../src/features/award-types/AwardTypesAdminPage')).default;
    render(<Page />);

    expect(pushMock).toHaveBeenCalledWith('/login');
  });
});
