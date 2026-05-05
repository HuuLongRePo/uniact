import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/contexts/AuthContext';
import type { User } from '@/types/database';
import { expectNoMojibake } from './helpers/mojibake';

const { clickMock, pushMock, routerMock, revokeObjectURLMock, toastErrorMock, toastSuccessMock } =
  vi.hoisted(() => ({
    clickMock: vi.fn(),
    pushMock: vi.fn(),
    routerMock: { push: vi.fn() },
    revokeObjectURLMock: vi.fn(),
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

describe('Admin scoreboard page', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(createAuthState());
    pushMock.mockReset();
    routerMock.push = pushMock;
    clickMock.mockReset();
    revokeObjectURLMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    vi.unstubAllGlobals();

    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn(() => 'blob:scoreboard'),
        revokeObjectURL: revokeObjectURLMock,
      })
    );
  });

  it('renders rankings and filter sources with clean text', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/api/admin/rankings?')) {
        return {
          ok: true,
          json: async () => ({
            rankings: [
              {
                rank: 1,
                student_id: 4,
                student_name: 'Nguyen Hoa',
                student_email: 'hoa@uniact.local',
                class_name: '11A2',
                total_points: 37,
                activity_count: 6,
                award_count: 1,
                avg_points: 6.2,
              },
            ],
            pagination: { page: 1, limit: 25, total: 1, pages: 1 },
          }),
        };
      }
      if (url === '/api/admin/classes?limit=200') {
        return {
          ok: true,
          json: async () => ({
            classes: [{ id: 1, name: '11A2' }],
          }),
        };
      }
      if (url === '/api/admin/organization-levels') {
        return {
          ok: true,
          json: async () => [{ id: 2, name: 'Cap truong' }],
        };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/scoreboard/page')).default;
    const { container } = render(<Page />);

    expect(await screen.findByTestId('admin-scoreboard-heading')).toHaveTextContent(
      'Bang xep hang chi tiet'
    );
    expect(screen.getAllByText('Nguyen Hoa').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Bo loc' }));
    expect(await screen.findByText('Cap to chuc')).toBeInTheDocument();
    expectNoMojibake(container.textContent || '');
  });

  it('exports scoreboard csv', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/admin/classes?limit=200') {
        return { ok: true, json: async () => ({ classes: [] }) };
      }
      if (url === '/api/admin/organization-levels') {
        return { ok: true, json: async () => [] };
      }
      return {
        ok: true,
        json: async () => ({
          rankings: [
            {
              rank: 1,
              student_id: 4,
              student_name: 'Nguyen Hoa',
              student_email: 'hoa@uniact.local',
              class_name: '11A2',
              total_points: 37,
              activity_count: 6,
              award_count: 1,
              avg_points: 6.2,
            },
          ],
          pagination: { page: 1, limit: 25, total: 1, pages: 1 },
        }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/scoreboard/page')).default;
    render(<Page />);

    expect(await screen.findByTestId('admin-scoreboard-heading')).toBeInTheDocument();

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName === 'a') {
        return {
          click: clickMock,
          href: '',
          download: '',
        } as unknown as HTMLAnchorElement;
      }
      return originalCreateElement(tagName);
    }) as typeof document.createElement);

    fireEvent.click(screen.getByRole('button', { name: 'CSV' }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Da xuat CSV bang xep hang');
    });
    expect(clickMock).toHaveBeenCalled();
  });

  it('redirects non-admin users to login', async () => {
    vi.mocked(useAuth).mockReturnValue(createAuthState('teacher'));

    const Page = (await import('../src/app/admin/scoreboard/page')).default;
    render(<Page />);

    expect(pushMock).toHaveBeenCalledWith('/login');
  });
});
