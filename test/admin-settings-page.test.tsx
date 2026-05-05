import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { User } from '@/types/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SystemConfigPageWrapper from '@/app/admin/settings/page';
import { useAuth } from '@/contexts/AuthContext';

const { pushMock, toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

vi.mock('@/components/ActivitySkeleton', () => ({
  default: () => <div data-testid="activity-skeleton">Loading</div>,
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

describe('Admin settings page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(createAuthState());

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method || 'GET';

      if (method === 'GET' && url.includes('/api/system-config?category=attendance')) {
        return {
          ok: true,
          json: async () => ({
            configs: [
              {
                config_key: 'attendance_qr_ttl',
                config_value: '120',
                data_type: 'number',
                category: 'attendance',
                description: 'QR TTL giay',
                updated_at: '2026-04-30T09:00:00.000Z',
              },
            ],
          }),
        } as Response;
      }

      if (method === 'PUT' && url === '/api/system-config') {
        return {
          ok: true,
          json: async () => ({ message: 'Da luu cau hinh' }),
        } as Response;
      }

      throw new Error(`Unhandled fetch: ${method} ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;
  });

  it('renders quick links and allows saving raw config edits', async () => {
    render(<SystemConfigPageWrapper />);

    expect(await screen.findByRole('heading', { name: 'Cai dat he thong' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Chinh sach diem danh/i })).toHaveAttribute(
      'href',
      '/admin/system-config/attendance-policy'
    );
    expect(screen.getByDisplayValue('120')).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('120'), { target: { value: '180' } });
    fireEvent.click(screen.getByRole('button', { name: /Luu cau hinh/i }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Da luu cau hinh');
    });
  });

  it('redirects guests away from admin settings', async () => {
    vi.mocked(useAuth).mockReturnValue({
      ...createAuthState('student'),
      user: null,
    } as any);

    render(<SystemConfigPageWrapper />);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/login');
    });
  });
});
