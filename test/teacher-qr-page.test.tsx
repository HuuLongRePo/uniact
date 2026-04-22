import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();
let searchParamsValue = '';

vi.mock('next/dynamic', () => ({
  default: () => () => <div>QR Code</div>,
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(searchParamsValue),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

describe('TeacherQRPage', () => {
  beforeEach(() => {
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    searchParamsValue = '';
  });

  it('reads canonical payload and hydrates active qr session for selected activity', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === '/api/activities?scope=operational&status=ongoing') {
        return {
          ok: true,
          json: async () => ({ data: { activities: [{ id: 1, title: 'QR Activity' }] } }),
        } as Response;
      }

      if (url === '/api/qr-sessions/active?activity_id=1') {
        return {
          ok: true,
          json: async () => ({
            data: {
              session: {
                session_id: 11,
                session_token: 'reuse-token-11',
                options: { single_use: false, max_scans: null },
              },
            },
          }),
        } as Response;
      }

      if (url === '/api/qr-sessions') {
        return {
          ok: true,
          json: async () => ({ data: { sessions: [{ id: 11, activity_id: 1, session_token: 'token', created_at: '2026-01-01', expires_at: '2026-01-01', metadata: '{}', activity_title: 'QR Activity', activity_date: '2026-01-01', attendance_count: 3 }] } }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/qr/page')).default;
    render(<Page />);

    expect(await screen.findByText('QR Activity')).toBeInTheDocument();
    expect(await screen.findByText('reuse-token-11')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/qr-sessions/active?activity_id=1');
  });

  it('surfaces load errors for activity options', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      json: async () => ({}),
    })) as unknown as typeof fetch;

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/qr/page')).default;
    render(<Page />);

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalled();
      const firstMessage = String(toastErrorMock.mock.calls[0]?.[0] || '');
      expect(firstMessage).toContain('danh');
    });
  });

  it('auto-opens projector mode when query requests fullscreen', async () => {
    searchParamsValue = 'activity_id=1&projector=1';

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === '/api/activities?scope=operational&status=ongoing') {
        return {
          ok: true,
          json: async () => ({ data: { activities: [{ id: 1, title: 'QR Activity' }] } }),
        } as Response;
      }

      if (url === '/api/qr-sessions/active?activity_id=1') {
        return {
          ok: true,
          json: async () => ({
            data: {
              session: {
                session_id: 11,
                session_token: 'reuse-token-11',
                options: { single_use: false, max_scans: null },
              },
            },
          }),
        } as Response;
      }

      if (url === '/api/qr-sessions') {
        return {
          ok: true,
          json: async () => ({ data: { sessions: [] } }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/qr/page')).default;
    render(<Page />);

    expect(await screen.findByText('Trình chiếu QR')).toBeInTheDocument();
    expect(screen.getByText('Giảng viên chiếu mã để học viên quét')).toBeInTheDocument();
  });
});

