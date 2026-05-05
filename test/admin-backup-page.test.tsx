import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@/types/database';
import BackupRestorePage from '@/app/admin/backup/page';
import { useAuth } from '@/contexts/AuthContext';
import { expectNoMojibake } from './helpers/mojibake';

const { pushMock, toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

const routerMock = {
  push: pushMock,
  replace: vi.fn(),
  back: vi.fn(),
  prefetch: vi.fn(),
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}));

vi.mock('@/components/LoadingSpinner', () => ({
  default: () => <div data-testid="loading-spinner">Loading</div>,
}));

vi.mock('@/components/ui/ConfirmDialog', () => ({
  ConfirmDialog: () => null,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
    success: toastSuccessMock,
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

describe('Admin backup page', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(createAuthState());
    pushMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('loads stats/backups and renders clean text without mojibake artifacts', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === '/api/admin/database/stats') {
        return {
          ok: true,
          json: async () => ({
            stats: {
              size_mb: 11.25,
              tables: 24,
              records: 1024,
              last_backup: '2026-04-25T02:00:00.000Z',
            },
          }),
        };
      }

      if (url === '/api/admin/database/backups') {
        return {
          ok: true,
          json: async () => ({
            backups: [
              {
                id: 8,
                filename: 'uniact_backup_2026-04-25_090000.db',
                size_mb: 4.12,
                created_at: '2026-04-25T02:00:00.000Z',
                created_by: 'admin@annd.edu.vn',
                status: 'success',
              },
            ],
          }),
        };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const { container } = render(<BackupRestorePage />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/admin/database/stats');
      expect(fetchMock).toHaveBeenCalledWith('/api/admin/database/backups');
    });

    expect(
      await screen.findByRole('heading', { name: /Sao luu va khoi phuc database/i })
    ).toBeInTheDocument();
    expectNoMojibake(container.textContent || '');
  });

  it('redirects non-admin users to login', () => {
    vi.mocked(useAuth).mockReturnValue(createAuthState('teacher'));
    render(<BackupRestorePage />);

    expect(pushMock).toHaveBeenCalledWith('/login');
  });
});
