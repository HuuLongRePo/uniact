import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { User } from '@/types/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QRSettingsConfigPage from '@/app/admin/system-config/qr-settings/page';
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

vi.mock('next/dynamic', () => ({
  default: () => (props: any) => (
    <div data-testid="mock-qr-preview" data-bg={props.bgColor} data-fg={props.fgColor}>
      QR Preview
    </div>
  ),
}));

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

describe('Admin QR settings page', () => {
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
              { config_key: 'qr_expiration_time', config_value: '5' },
              { config_key: 'qr_bg_color', config_value: '#ffffff' },
              { config_key: 'qr_text_color', config_value: '#111111' },
              { config_key: 'qr_logo_enabled', config_value: 'false' },
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

  it('renders QR settings and saves valid changes', async () => {
    render(<QRSettingsConfigPage />);

    expect(await screen.findByRole('heading', { name: 'Cai dat QR diem danh' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
    expect(screen.getByTestId('mock-qr-preview')).toHaveAttribute('data-fg', '#111111');

    fireEvent.change(await screen.findByLabelText('So phut hieu luc'), {
      target: { value: '15' },
    });
    fireEvent.click(await screen.findByRole('button', { name: /Luu cau hinh QR/i }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Da cap nhat cai dat QR');
    });
  });

  it('blocks invalid hex colors before saving', async () => {
    render(<QRSettingsConfigPage />);

    await screen.findByRole('heading', { name: 'Cai dat QR diem danh' });
    fireEvent.change(await screen.findByPlaceholderText('#ffffff'), {
      target: { value: 'white' },
    });
    fireEvent.click(await screen.findByRole('button', { name: /Luu cau hinh QR/i }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Mau QR phai dung dinh dang hex, vi du #ffffff'
      );
    });
  });
});
