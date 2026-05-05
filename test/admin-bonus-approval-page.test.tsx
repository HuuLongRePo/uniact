import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

describe('Admin bonus approval page', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(createAuthState());
    pushMock.mockReset();
    routerMock.push = pushMock;
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('renders proposals with clean text', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === '/api/bonus') {
        return {
          ok: true,
          json: async () => ({
            suggestions: [
              {
                id: 5,
                student_id: 3,
                student_name: 'Tran Ly',
                student_email: 'ly@uniact.local',
                points: 10,
                source_type: 'activity',
                status: 'pending',
                author_id: 8,
                author_name: 'Teacher A',
                created_at: '2026-05-01T08:00:00.000Z',
                updated_at: '2026-05-01T08:00:00.000Z',
              },
            ],
          }),
        };
      }
      throw new Error(`Unexpected fetch: ${String(input)}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/bonus-approval/page')).default;
    const { container } = render(<Page />);

    expect(await screen.findByTestId('admin-bonus-approval-heading')).toHaveTextContent(
      'Duyet de xuat cong diem'
    );
    expect(screen.getAllByText('Tran Ly').length).toBeGreaterThan(0);
    expect(screen.getByText('Teacher A')).toBeInTheDocument();
    expectNoMojibake(container.textContent || '');
  });

  it('approves a pending proposal', async () => {
    let approved = false;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
      const url = String(input);

      if (url === '/api/bonus/5/approve' && options?.method === 'POST') {
        approved = true;
        return {
          ok: true,
          json: async () => ({ success: true }),
        };
      }

      if (url === '/api/bonus') {
        return {
          ok: true,
          json: async () => ({
            suggestions: [
              {
                id: 5,
                student_id: 3,
                student_name: 'Tran Ly',
                student_email: 'ly@uniact.local',
                points: 10,
                source_type: 'activity',
                status: approved ? 'approved' : 'pending',
                author_id: 8,
                author_name: 'Teacher A',
                created_at: '2026-05-01T08:00:00.000Z',
                updated_at: '2026-05-01T08:00:00.000Z',
              },
            ],
          }),
        };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/bonus-approval/page')).default;
    render(<Page />);

    expect((await screen.findAllByText('Tran Ly')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole('button', { name: /Xem/ })[0]);
    const dialog = await screen.findByRole('dialog', { name: 'Tran Ly' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Phe duyet' }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Da phe duyet de xuat cong diem');
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/bonus/5/approve',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('redirects non-admin users to login', async () => {
    vi.mocked(useAuth).mockReturnValue(createAuthState('teacher'));

    const Page = (await import('../src/app/admin/bonus-approval/page')).default;
    render(<Page />);

    expect(pushMock).toHaveBeenCalledWith('/login');
  });
});
