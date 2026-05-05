import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { User } from '@/types/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ApprovalDeadlineConfigPage from '@/app/admin/system-config/approval-deadline/page';
import { useAuth } from '@/contexts/AuthContext';

const { pushMock, toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
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
  default: {
    error: toastErrorMock,
    success: toastSuccessMock,
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

describe('Admin approval deadline page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(createAuthState());

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method || 'GET';

      if (method === 'GET' && url.includes('/api/system-config?category=approval')) {
        return {
          ok: true,
          json: async () => ({
            configs: [
              { config_key: 'approval_deadline_hours', config_value: '48' },
              { config_key: 'warning_threshold_hours', config_value: '24' },
              { config_key: 'enable_notifications', config_value: 'true' },
            ],
          }),
        } as Response;
      }

      if (method === 'PUT' && url === '/api/system-config') {
        return {
          ok: true,
          json: async () => ({ message: 'saved' }),
        } as Response;
      }

      throw new Error(`Unhandled fetch: ${method} ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;
  });

  it('renders approval deadline config and saves valid settings', async () => {
    render(<ApprovalDeadlineConfigPage />);

    expect(await screen.findByRole('heading', { name: 'Han chot phe duyet' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('48')).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('24'), {
      target: { value: '12' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Luu cau hinh han chot/i }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Da cap nhat han chot phe duyet');
    });
  });

  it('blocks invalid thresholds before saving', async () => {
    render(<ApprovalDeadlineConfigPage />);

    await screen.findByRole('heading', { name: 'Han chot phe duyet' });
    fireEvent.change(screen.getByDisplayValue('24'), {
      target: { value: '72' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Luu cau hinh han chot/i }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Nguong canh bao phai nho hon deadline');
    });
  });
});
