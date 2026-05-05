import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@/types/database';
import DeviceManagementPage from '@/app/student/devices/page';
import { useAuth } from '@/contexts/AuthContext';

const pushMock = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/student/devices',
}));

vi.mock('@/components/LoadingSpinner', () => ({
  default: () => <div data-testid="loading-spinner">Loading</div>,
}));

vi.mock('@/components/ui/ConfirmDialog', () => ({
  ConfirmDialog: () => null,
}));

function createAuthState(role: string = 'student') {
  return {
    user: { id: 1, role } as User,
    loading: false,
    login: vi.fn(async () => undefined),
    logout: vi.fn(async () => undefined),
    register: vi.fn(async () => undefined),
  };
}

describe('DeviceManagementPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    vi.mocked(useAuth).mockReturnValue(createAuthState());
  });

  it('reads the canonical devices payload from the user devices endpoint', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        devices: [
          {
            id: 3,
            device_name: 'Student Mobile',
            mac_address: 'AA:BB:CC:DD:EE:FF',
            approved: 1,
            last_seen: '2026-04-29T08:00:00.000Z',
            created_at: '2026-04-01T08:00:00.000Z',
          },
        ],
      }),
    }));

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    render(<DeviceManagementPage />);

    expect(await screen.findByText('Student Mobile')).toBeInTheDocument();
    expect(screen.getByText('Tác vụ nhanh')).toBeInTheDocument();
    expect(screen.getByText(/AA:BB:CC:DD:EE:FF/)).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/user/devices');
    });
  });
});
