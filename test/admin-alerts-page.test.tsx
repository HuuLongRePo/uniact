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

describe('Admin alerts page', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(createAuthState());
    pushMock.mockReset();
    routerMock.push = pushMock;
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('renders clean alerts and summary cards', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
      if (String(input) === '/api/alerts' && !options?.method) {
        return {
          ok: true,
          json: async () => ({
            alerts: [
              {
                id: 9,
                level: 'critical',
                message: 'QR runtime dang bi tre.',
                related_table: 'activities',
                related_id: 4,
                is_read: false,
                resolved: false,
                resolved_at: null,
                created_at: '2026-05-01T10:30:00.000Z',
              },
            ],
            summary: {
              total_alerts: 1,
              unread_alerts: 1,
              unresolved_alerts: 1,
              critical_alerts: 1,
              warning_alerts: 0,
              info_alerts: 0,
            },
          }),
        };
      }

      throw new Error(`Unexpected fetch: ${String(input)}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/alerts/page')).default;
    const { container } = render(<Page />);

    expect(await screen.findByTestId('admin-alerts-heading')).toHaveTextContent('Canh bao he thong');
    expect(screen.getByText('QR runtime dang bi tre.')).toBeInTheDocument();
    expect(screen.getByText('Tong canh bao')).toBeInTheDocument();
    expect(screen.getAllByText('Chua doc').length).toBeGreaterThan(0);
    expectNoMojibake(container.textContent || '');
  });

  it('marks an alert as read and refreshes the list', async () => {
    let markedRead = false;

    const fetchMock = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
      const url = String(input);

      if (url === '/api/alerts' && options?.method === 'PUT') {
        markedRead = true;
        return {
          ok: true,
          json: async () => ({ success: true }),
        };
      }

      if (url === '/api/alerts') {
        return {
          ok: true,
          json: async () => ({
            alerts: [
              {
                id: 9,
                level: 'warning',
                message: 'Face attendance fallback dang mo.',
                related_table: 'activities',
                related_id: 7,
                is_read: markedRead,
                resolved: false,
                resolved_at: null,
                created_at: '2026-05-01T10:30:00.000Z',
              },
            ],
            summary: {
              total_alerts: 1,
              unread_alerts: markedRead ? 0 : 1,
              unresolved_alerts: 1,
              critical_alerts: 0,
              warning_alerts: 1,
              info_alerts: 0,
            },
          }),
        };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/alerts/page')).default;
    render(<Page />);

    expect(await screen.findByText('Face attendance fallback dang mo.')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Danh dau da doc' })[1]);

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Da danh dau 1 canh bao la da doc');
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/alerts',
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('redirects non-admin users to login', async () => {
    vi.mocked(useAuth).mockReturnValue(createAuthState('teacher'));

    const Page = (await import('../src/app/admin/alerts/page')).default;
    render(<Page />);

    expect(pushMock).toHaveBeenCalledWith('/login');
  });
});
