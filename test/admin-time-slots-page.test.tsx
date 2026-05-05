import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/contexts/AuthContext';
import type { User } from '@/types/database';
import { expectNoMojibake } from './helpers/mojibake';

const { pushMock, routerMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  routerMock: { push: vi.fn() },
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

function createAuthState(role: string = 'admin') {
  return {
    user: { id: 1, role } as User,
    loading: false,
    login: vi.fn(async () => undefined),
    logout: vi.fn(async () => undefined),
    register: vi.fn(async () => undefined),
  };
}

describe('Admin time slots page', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(createAuthState());
    pushMock.mockReset();
    routerMock.push = pushMock;
    vi.unstubAllGlobals();
  });

  it('renders scheduler and creates slots with clean text', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
      const url = String(input);
      if (url === '/api/admin/activities?limit=100') {
        return {
          ok: true,
          json: async () => ({
            activities: [
              {
                id: 11,
                title: 'Ngay hoi CLB',
                max_participants: 800,
                date_time: '2026-05-04T08:00:00.000Z',
              },
            ],
          }),
        };
      }
      if (url === '/api/admin/time-slots?activity_id=11') {
        return {
          ok: true,
          json: async () => ({ success: true, slots: [] }),
        };
      }
      if (url === '/api/admin/time-slots/create' && options?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            message: 'Da tao 2 khung gio',
            slots: [
              {
                id: 1,
                slot_start: '08:00:00',
                slot_end: '09:00:00',
                max_concurrent: 500,
                current_registered: 0,
                status: 'available',
              },
              {
                id: 2,
                slot_start: '09:00:00',
                slot_end: '10:00:00',
                max_concurrent: 500,
                current_registered: 0,
                status: 'available',
              },
            ],
          }),
        };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/time-slots/page')).default;
    const { container } = render(<Page />);

    expect(await screen.findByTestId('admin-time-slots-heading')).toHaveTextContent(
      'Dieu phoi khung gio hoat dong'
    );
    expect(screen.getByText(/Ngay hoi CLB/)).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '11' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tao khung gio' }));

    await waitFor(() => {
      expect(screen.getByText('Da tao 2 khung gio')).toBeInTheDocument();
    });
    expect(screen.getByText('08:00 - 09:00')).toBeInTheDocument();
    expectNoMojibake(container.textContent || '');
  });

  it('redirects non-admin users to login', async () => {
    vi.mocked(useAuth).mockReturnValue(createAuthState('teacher'));

    const Page = (await import('../src/app/admin/time-slots/page')).default;
    render(<Page />);

    expect(pushMock).toHaveBeenCalledWith('/login');
  });
});
