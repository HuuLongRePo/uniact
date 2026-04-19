import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: vi.fn() }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, role: 'teacher' }, loading: false }),
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    error: toastErrorMock,
    success: vi.fn(),
  },
}));

describe('NotificationSettingsPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    toastErrorMock.mockReset();
  });

  it('reads canonical nested settings payload', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: {
          settings: {
            channels: [{ id: 1, type: 'email', is_enabled: true, is_default: true }],
            templates: [],
            default_time: '08:00',
            batch_notifications: true,
            allow_scheduling: true,
          },
        },
      }),
    })) as any;

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/notifications/settings/page')).default;
    render(<Page />);

    expect(await screen.findByText('Cài đặt thông báo')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('surfaces fetch errors from API payload', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: 'Không thể tải cài đặt thông báo' }),
    })) as any;

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/notifications/settings/page')).default;
    render(<Page />);

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Không thể tải cài đặt thông báo');
    });
  });
});
