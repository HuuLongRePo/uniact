import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { User } from '@/types/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AttendancePolicySystemConfigPage from '@/app/admin/system-config/attendance-policy/page';
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

describe('Admin attendance policy page', () => {
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
                id: 1,
                config_key: 'attendance_policy_version',
                config_value: 'rollout-v2',
                data_type: 'string',
                category: 'attendance',
                description: 'Policy version',
              },
              {
                id: 2,
                config_key: 'attendance_qr_fallback_preset',
                config_value: 'strict-lan',
                data_type: 'string',
                category: 'attendance',
                description: 'QR preset',
              },
              {
                id: 3,
                config_key: 'attendance_face_pilot_selection_mode',
                config_value: 'selected_only',
                data_type: 'string',
                category: 'attendance',
                description: 'Selection mode',
              },
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

  it('renders the admin attendance policy heading and saves changes', async () => {
    render(<AttendancePolicySystemConfigPage />);

    expect(await screen.findByTestId('admin-attendance-policy-heading')).toHaveTextContent(
      'Chinh sach diem danh'
    );
    const presetInput = await screen.findByDisplayValue('strict-lan');
    expect(screen.getByDisplayValue('rollout-v2')).toBeInTheDocument();

    fireEvent.change(presetInput, {
      target: { value: 'balanced-lan' },
    });
    fireEvent.click(await screen.findByRole('button', { name: /Luu chinh sach diem danh/i }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Da luu attendance policy config');
    });
  });

  it('redirects guests away from the admin attendance policy page', async () => {
    vi.mocked(useAuth).mockReturnValue({
      ...createAuthState('student'),
      user: null,
    } as any);

    render(<AttendancePolicySystemConfigPage />);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/login');
    });
  });
});
