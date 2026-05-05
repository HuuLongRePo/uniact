import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
const backMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: backMock }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, role: 'teacher' }, loading: false }),
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('NotificationHistoryPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    backMock.mockReset();
  });

  it('renders canonical history payload', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/classes') {
        return {
          ok: true,
          json: async () => ({ data: { classes: [{ id: 1, name: '12A1' }] } }),
        } as Response;
      }
      if (url === '/api/teacher/notifications/history') {
        return {
          ok: true,
          json: async () => ({
            data: {
              records: [
                {
                  id: 10,
                  notification_id: 20,
                  notification_title: 'Nhac diem danh',
                  student_id: 3,
                  student_name: 'Nguyen Van A',
                  class_name: '12A1',
                  sent_at: '2026-04-22T07:00:00Z',
                  read_at: null,
                  is_read: false,
                  read_on_device: 'unknown',
                },
              ],
              notifications: [],
              summary: {
                total_notifications: 1,
                total_recipients: 1,
                total_read: 0,
                total_unread: 1,
                low_read_notifications: [],
              },
            },
          }),
        } as Response;
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/notifications/history/page')).default;
    render(<Page />);

    expect(await screen.findByText('Lịch sử thông báo')).toBeInTheDocument();
    expect(await screen.findByText('Nhac diem danh')).toBeInTheDocument();
    expect(await screen.findByText('Nguyen Van A')).toBeInTheDocument();
  });
});
