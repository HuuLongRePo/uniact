import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('Admin search page', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(createAuthState());
    pushMock.mockReset();
    routerMock.push = pushMock;
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('searches with admin header and renders clean results', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        query: 'chien dich he',
        total: 2,
        users: [
          {
            id: 4,
            name: 'Le Admin',
            email: 'admin@uniact.local',
            role: 'admin',
            created_at: '2026-05-01T09:00:00.000Z',
          },
        ],
        activities: [
          {
            id: 8,
            title: 'Chien dich he 2026',
            location: 'Hoi truong A',
            date: '2026-05-04T07:00:00.000Z',
            status: 'approved',
            activity_type: 'Tinh nguyen',
            org_level: 'Cap truong',
            creator_name: 'Teacher One',
          },
        ],
        classes: [],
        awards: [],
      }),
    }));

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/search/page')).default;
    const { container } = render(<Page />);

    expect(await screen.findByTestId('admin-search-heading')).toHaveTextContent(
      'Tim kiem nang cao'
    );
    fireEvent.change(screen.getByPlaceholderText('Nhap tu khoa can tim...'), {
      target: { value: 'chien dich he' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tim kiem' }));

    expect(await screen.findByText('Chien dich he 2026')).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/search?q=chien+dich+he&type=all',
        expect.objectContaining({
          headers: {
            'x-user-role': 'admin',
          },
        })
      );
    });
    expectNoMojibake(container.textContent || '');
  });

  it('saves current search preset', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          query: 'qr',
          total: 0,
          users: [],
          activities: [],
          classes: [],
          awards: [],
        }),
      }))
    );
    window.fetch = fetch as typeof fetch;

    const Page = (await import('../src/app/admin/search/page')).default;
    render(<Page />);

    fireEvent.change(screen.getByPlaceholderText('Nhap tu khoa can tim...'), {
      target: { value: 'qr' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Luu bo loc' }));
    fireEvent.change(screen.getByPlaceholderText('Vi du: activity pending thang nay'), {
      target: { value: 'Bo loc QR' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Luu bo loc' })[1]);

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Da luu bo loc "Bo loc QR"');
    });
    expect(localStorage.getItem('admin-saved-searches')).toContain('Bo loc QR');
  });

  it('redirects non-admin users to login', async () => {
    vi.mocked(useAuth).mockReturnValue(createAuthState('teacher'));

    const Page = (await import('../src/app/admin/search/page')).default;
    render(<Page />);

    expect(pushMock).toHaveBeenCalledWith('/login');
  });
});
