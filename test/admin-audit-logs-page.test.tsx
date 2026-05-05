import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/contexts/AuthContext';
import type { User } from '@/types/database';
import { expectNoMojibake } from './helpers/mojibake';

const { appendChildMock, clickMock, pushMock, removeMock, revokeObjectURLMock, routerMock, toastErrorMock, toastSuccessMock } =
  vi.hoisted(() => ({
    appendChildMock: vi.fn(),
    clickMock: vi.fn(),
    pushMock: vi.fn(),
    removeMock: vi.fn(),
    revokeObjectURLMock: vi.fn(),
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

describe('Admin audit logs page', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(createAuthState());
    pushMock.mockReset();
    routerMock.push = pushMock;
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    appendChildMock.mockReset();
    clickMock.mockReset();
    removeMock.mockReset();
    revokeObjectURLMock.mockReset();
    vi.unstubAllGlobals();

    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn(() => 'blob:uniact'),
        revokeObjectURL: revokeObjectURLMock,
      })
    );

  });

  it('renders clean audit logs and opens detail modal', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        logs: [
          {
            id: 41,
            actor_id: 7,
            actor_name: 'Admin root',
            actor_email: 'admin@uniact.local',
            actor_role: 'admin',
            action: 'UPDATE_ATTENDANCE_POLICY',
            target_table: 'system_config',
            target_id: 3,
            details: 'Updated QR TTL from 45 to 60 seconds.',
            created_at: '2026-05-01T11:00:00.000Z',
          },
        ],
        meta: { total: 1, page: 1, per_page: 50 },
      }),
    }));

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/audit-logs/page')).default;
    const { container } = render(<Page />);

    expect(await screen.findByTestId('admin-audit-logs-heading')).toHaveTextContent(
      'Nhat ky chi tiet'
    );
    expect(screen.getAllByText('Admin root').length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole('button', { name: 'Xem chi tiet' })[0]);
    const dialog = await screen.findByRole('dialog', { name: 'Log #41' });
    expect(
      within(dialog).getByRole('heading', {
        level: 3,
        name: 'Log #41',
      })
    ).toBeInTheDocument();
    expect(within(dialog).getByText('Updated QR TTL from 45 to 60 seconds.')).toBeInTheDocument();
    expectNoMojibake(container.textContent || '');
  });

  it('exports csv with current filters', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes('export=csv')) {
        return {
          ok: true,
          json: async () => ({
            csv: 'id,actor_id\n41,7\n',
          }),
        };
      }

      return {
        ok: true,
        json: async () => ({
          logs: [],
          meta: { total: 0, page: 1, per_page: 50 },
        }),
      };
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/audit-logs/page')).default;
    render(<Page />);

    expect(await screen.findByTestId('admin-audit-logs-heading')).toBeInTheDocument();
    const originalCreateElement = document.createElement.bind(document);
    const originalAppendChild = document.body.appendChild.bind(document.body);

    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName === 'a') {
        return {
          click: clickMock,
          remove: removeMock,
          href: '',
          download: '',
        } as unknown as HTMLAnchorElement;
      }

      return originalCreateElement(tagName);
    }) as typeof document.createElement);

    vi.spyOn(document.body, 'appendChild').mockImplementation(
      ((node: Node) => {
        appendChildMock(node);
        return node instanceof Node ? originalAppendChild(node) : node;
      }) as typeof document.body.appendChild
    );

    fireEvent.click(screen.getByRole('button', { name: 'Xuat CSV' }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Da xuat nhat ky ra CSV');
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/audit-logs?export=csv');
  });

  it('redirects non-admin users to login', async () => {
    vi.mocked(useAuth).mockReturnValue(createAuthState('teacher'));

    const Page = (await import('../src/app/admin/audit-logs/page')).default;
    render(<Page />);

    expect(pushMock).toHaveBeenCalledWith('/login');
  });
});
