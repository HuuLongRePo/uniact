import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

describe('BroadcastNotificationsPage', () => {
  beforeEach(() => {
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
  });

  it('renders canonical broadcast payload', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/api/teacher/broadcast-notifications?status=')) {
        return {
          ok: true,
          json: async () => ({
            data: {
              notifications: [
                {
                  id: 11,
                  title: 'Nhắc nộp bài',
                  message: 'Học viên nộp bài trước 20:00',
                  target_type: 'class',
                  target_ids: [1],
                  recipient_count: 30,
                  status: 'draft',
                  created_at: '2026-04-22T06:00:00Z',
                  created_by: 'teacher',
                },
              ],
            },
          }),
        } as Response;
      }
      if (url === '/api/classes') {
        return {
          ok: true,
          json: async () => ({ data: { classes: [{ id: 1, name: '12A1', student_count: 30 }] } }),
        } as Response;
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/notifications/broadcast/page')).default;
    render(<Page />);

    expect(await screen.findByText('Thông báo quảng bá')).toBeInTheDocument();
    expect(await screen.findByText('Nhắc nộp bài')).toBeInTheDocument();
    expect(await screen.findByText('Học viên nộp bài trước 20:00')).toBeInTheDocument();
  });
});
