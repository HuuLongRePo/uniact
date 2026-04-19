import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();

vi.mock('next/dynamic', () => ({
  default: () => () => <div>QR Code</div>,
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
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
  });

  it('reads canonical nested payload for activities and history', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === '/api/activities?scope=operational&status=ongoing') {
        return {
          ok: true,
          json: async () => ({ data: { activities: [{ id: 1, title: 'QR Activity' }] } }),
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
  });

  it('surfaces load errors for activity options', async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, json: async () => ({}) })) as any;

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/qr/page')).default;
    render(<Page />);

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Không thể tải danh sách hoạt động');
    });
  });
});
