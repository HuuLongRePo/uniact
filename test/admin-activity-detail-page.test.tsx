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
  useParams: () => ({ id: '42' }),
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
    <a href={href} {...props}>
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

describe('Admin activity detail page', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(createAuthState());
    pushMock.mockReset();
    routerMock.push = pushMock;
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('renders canonical activity payload, participants and approval history with clean text', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === '/api/admin/activities/42') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              activity: {
                id: 42,
                title: 'Ngay hoi huong nghiep',
                description: 'Mo ta dieu phoi',
                activity_type_name: 'Huong nghiep',
                organization_level_name: 'Cap truong',
                date_time: '2026-05-02T01:00:00.000Z',
                end_time: '2026-05-02T04:00:00.000Z',
                location: 'Hoi truong A',
                max_participants: 200,
                status: 'pending',
                approval_status: 'requested',
                creator_name: 'Teacher B',
              },
            },
          }),
        };
      }

      if (url === '/api/admin/activities/42/participants') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            participants: [
              {
                id: 1,
                user_id: 5,
                user_name: 'Tran Minh',
                user_email: 'tran.minh@uniact.local',
                class_name: 'CNTT K66A',
                registered_at: '2026-05-01T08:00:00.000Z',
                attendance_status: 'present',
                achievement_level: 'good',
                points_earned: 15,
              },
            ],
          }),
        };
      }

      if (url === '/api/admin/activities/42/approval-history') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            history: [
              {
                id: 7,
                status: 'requested',
                status_label: 'Da gui duyet',
                changed_by_name: 'Teacher B',
                changed_at: '2026-05-01T07:00:00.000Z',
                notes: 'Can duyet trong ngay',
              },
            ],
          }),
        };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/activities/[id]/page')).default;
    const { container } = render(<Page />);

    expect(await screen.findByTestId('admin-activity-detail-heading')).toHaveTextContent(
      'Ngay hoi huong nghiep'
    );
    expect(screen.getByText(/Teacher B/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Nguoi tham gia/i }));
    expect((await screen.findAllByText('Tran Minh')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('15').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Lich su duyet/i }));
    expect(await screen.findByText('Can duyet trong ngay')).toBeInTheDocument();
    expectNoMojibake(container.textContent || '');
  });

  it('approves a pending activity from the review modal', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === '/api/admin/activities/42/approval' && init?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            message: 'Hoat dong da duoc phe duyet',
          }),
        };
      }

      if (url === '/api/admin/activities/42') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            activity: {
              id: 42,
              title: 'Ngay hoi huong nghiep',
              description: 'Mo ta dieu phoi',
              activity_type_name: 'Huong nghiep',
              organization_level_name: 'Cap truong',
              date_time: '2026-05-02T01:00:00.000Z',
              end_time: '2026-05-02T04:00:00.000Z',
              location: 'Hoi truong A',
              max_participants: 200,
              status: 'pending',
              approval_status: 'requested',
              creator_name: 'Teacher B',
            },
          }),
        };
      }

      if (url === '/api/admin/activities/42/participants') {
        return {
          ok: true,
          json: async () => ({ success: true, participants: [] }),
        };
      }

      if (url === '/api/admin/activities/42/approval-history') {
        return {
          ok: true,
          json: async () => ({ success: true, history: [] }),
        };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/activities/[id]/page')).default;
    render(<Page />);

    expect(await screen.findByTestId('admin-activity-detail-heading')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Phe duyet$/i }));
    const dialog = await screen.findByRole('dialog', { name: 'Phe duyet hoat dong' });
    fireEvent.change(within(dialog).getByPlaceholderText('Nhap ghi chu neu can...'), {
      target: { value: 'Hop le va du dieu kien cong bo' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xac nhan phe duyet' }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Hoat dong da duoc phe duyet');
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/activities/42/approval',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          action: 'approve',
          notes: 'Hop le va du dieu kien cong bo',
        }),
      })
    );
  });
});
