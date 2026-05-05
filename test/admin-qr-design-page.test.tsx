import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { User } from '@/types/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QRDesignCustomizationPage from '@/app/admin/system-config/qr-design/page';
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
    <div data-testid="mock-qr-design-preview" data-level={props.level}>
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

describe('Admin QR design page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(createAuthState());

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method || 'GET';

      if (method === 'GET' && url === '/api/admin/qr-design') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            bgColor: '#ffffff',
            textColor: '#111111',
            eyeColor: '#111111',
            logoEnabled: false,
            logoUrl: null,
            logoSize: 25,
            errorCorrection: 'H',
            expirationTime: 5,
            customText: '',
          }),
        } as Response;
      }

      if (method === 'PUT' && url === '/api/admin/qr-design') {
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

  it('renders QR design and saves after applying a preset', async () => {
    render(<QRDesignCustomizationPage />);

    expect(await screen.findByRole('heading', { name: 'QR design' })).toBeInTheDocument();
    expect(screen.getByTestId('mock-qr-design-preview')).toHaveAttribute('data-level', 'H');

    fireEvent.click(screen.getByRole('button', { name: 'projector' }));
    fireEvent.click(screen.getByRole('button', { name: /Luu QR design/i }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Da luu QR design');
    });
  });

  it('blocks invalid expiration time before saving', async () => {
    render(<QRDesignCustomizationPage />);

    expect(await screen.findByRole('heading', { name: 'QR design' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Nang cao' }));
    fireEvent.change(screen.getByLabelText('Thoi han preview (phut)'), {
      target: { value: '0' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Luu QR design/i }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Thoi han trong QR design phai tu 1 den 1440 phut'
      );
    });
  });
});
