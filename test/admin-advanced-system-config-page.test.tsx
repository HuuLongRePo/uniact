import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { User } from '@/types/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SystemConfigAdvancedPage from '@/app/admin/system-config/advanced/page';
import { useAuth } from '@/contexts/AuthContext';

const { pushMock, toastErrorMock, toastSuccessMock, toastLoadingMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastLoadingMock: vi.fn(),
}));

const router = {
  push: pushMock,
  replace: vi.fn(),
  back: vi.fn(),
  prefetch: vi.fn(),
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => router,
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    error: toastErrorMock,
    success: toastSuccessMock,
    loading: toastLoadingMock,
  },
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

describe('Admin advanced system config page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(createAuthState());

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method || 'GET';

      if (method === 'GET' && url === '/api/admin/system-config/advanced') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            email: {
              provider: 'nodemailer',
              smtpHost: 'smtp.example.com',
              smtpPort: '587',
              smtpUser: 'mailer@example.com',
              smtpPass: 'secret',
              smtpFrom: 'UniAct <noreply@example.com>',
              enabled: true,
            },
            backup: {
              autoBackup: true,
              backupTime: '02:00',
              retentionDays: 7,
              backupLocation: '/backups',
            },
            maintenance: {
              enabled: false,
              message: 'He thong dang bao tri. Vui long quay lai sau.',
            },
          }),
        } as Response;
      }

      if (method === 'GET' && url === '/api/admin/system-stats') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            dbSize: '12.40 MB',
            dbPath: 'C:\\data\\uniact.db',
            uptime: '11h 15m',
            lastBackup: '30/04/2026 10:15',
          }),
        } as Response;
      }

      if (method === 'PUT' && url === '/api/admin/system-config/advanced') {
        return {
          ok: true,
          json: async () => ({ success: true }),
        } as Response;
      }

      throw new Error(`Unhandled fetch: ${method} ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;
  });

  it('renders advanced settings and saves email config', async () => {
    render(<SystemConfigAdvancedPage />);

    expect(await screen.findByRole('heading', { name: 'Cau hinh nang cao' })).toBeInTheDocument();
    expect(screen.getByText('12.40 MB')).toBeInTheDocument();
    expect(screen.getByDisplayValue('smtp.example.com')).toBeInTheDocument();

    fireEvent.change(await screen.findByDisplayValue('smtp.example.com'), {
      target: { value: 'smtp.mail.local' },
    });
    fireEvent.click(await screen.findByRole('button', { name: /Luu email/i }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Da luu cau hinh email');
    });
  });

  it('toggles maintenance mode through the canonical route', async () => {
    render(<SystemConfigAdvancedPage />);

    expect(await screen.findByRole('heading', { name: 'Cau hinh nang cao' })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: /Bat maintenance mode/i }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Da bat maintenance mode');
    });
  });
});
