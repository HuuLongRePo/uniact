import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

describe('Admin leaderboard page', () => {
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
        createObjectURL: vi.fn(() => 'blob:leaderboard'),
        revokeObjectURL: revokeObjectURLMock,
      })
    );
  });

  it('renders leaderboard with clean text', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        leaderboard: [
          {
            rank: 1,
            user_id: 7,
            name: 'Pham An',
            email: 'an@uniact.local',
            class_name: '12A1',
            total_points: 42,
            activities_count: 8,
          },
        ],
      }),
    }));

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/leaderboard/page')).default;
    const { container } = render(<Page />);

    expect(await screen.findByTestId('admin-leaderboard-heading')).toHaveTextContent(
      'Bang xep hang tong hop'
    );
    expect(screen.getAllByText('Pham An').length).toBeGreaterThan(0);
    expect(screen.getByText('Top 1 hien tai')).toBeInTheDocument();
    expectNoMojibake(container.textContent || '');
  });

  it('exports leaderboard csv from selected columns', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        leaderboard: [
          {
            rank: 1,
            user_id: 7,
            name: 'Pham An',
            email: 'an@uniact.local',
            class_name: '12A1',
            total_points: 42,
            activities_count: 8,
          },
        ],
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/leaderboard/page')).default;
    render(<Page />);

    expect(await screen.findByTestId('admin-leaderboard-heading')).toBeInTheDocument();

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

    fireEvent.click(screen.getByRole('button', { name: 'Xuat file' }));
    const dialog = await screen.findByRole('dialog', { name: 'Xuat leaderboard' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'CSV' }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Da xuat leaderboard CSV');
    });
    expect(clickMock).toHaveBeenCalled();
  });

  it('redirects non-admin users to login', async () => {
    vi.mocked(useAuth).mockReturnValue(createAuthState('teacher'));

    const Page = (await import('../src/app/admin/leaderboard/page')).default;
    render(<Page />);

    expect(pushMock).toHaveBeenCalledWith('/login');
  });
});
