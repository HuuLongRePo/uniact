import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { User } from '@/types/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ParticipationReportsPage from '@/app/teacher/reports/participation/page';
import { useAuth } from '@/contexts/AuthContext';

const { pushMock, backMock, toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  backMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

const router = {
  push: pushMock,
  replace: vi.fn(),
  back: backMock,
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
  },
}));

vi.mock('@/components/LoadingSpinner', () => ({
  default: () => <div data-testid="loading-spinner">Loading</div>,
}));

function createAuthState(role: string = 'teacher') {
  return {
    user: { id: 1, role } as User,
    loading: false,
    login: vi.fn(async () => undefined),
    logout: vi.fn(async () => undefined),
    register: vi.fn(async () => undefined),
  };
}

describe('ParticipationReportsPage', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(createAuthState());
    pushMock.mockReset();
    backMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url') as any;
  });

  it('surfaces canonical export error payloads', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === '/api/classes') {
        return { ok: true, json: async () => ({ classes: [] }) };
      }

      if (url === '/api/teacher/reports/participation' && !init) {
        return { ok: true, json: async () => ({ data: { records: [], summary: [] } }) };
      }

      if (url === '/api/activity-types') {
        return { ok: true, json: async () => ({ activityTypes: [] }) };
      }

      if (url === '/api/teacher/reports/participation/export') {
        return {
          ok: false,
          json: async () => ({ error: 'Khong co quyen truy cap' }),
          blob: async () => new Blob(),
        };
      }

      return { ok: true, json: async () => ({}) };
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<ParticipationReportsPage />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/teacher/reports/participation');
    });

    fireEvent.click(screen.getByRole('button', { name: /xuat pdf/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/teacher/reports/participation/export',
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(toastErrorMock).toHaveBeenCalledWith('Khong co quyen truy cap');
    });
  });
});
