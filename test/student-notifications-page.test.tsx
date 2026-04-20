import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const toastErrorMock = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 5, role: 'student' } }),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
    success: vi.fn(),
  },
}));

describe('StudentNotifications', () => {
  beforeEach(() => {
    toastErrorMock.mockReset();
  });

  it('reads canonical nested notifications and settings payloads', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/notifications') {
        return {
          ok: true,
          json: async () => ({ data: { notifications: [{ id: 1, type: 'system', title: 'Có thông báo mới', message: 'Test', related_table: null, related_id: null, is_read: 0, created_at: '2026-04-19T10:00:00Z' }], meta: { total_unread: 1 } } }),
        } as Response;
      }
      if (url === '/api/notifications/settings') {
        return {
          ok: true,
          json: async () => ({ data: { settings: { email_enabled: true, new_activity_enabled: true, reminder_enabled: true, reminder_days: 2 } } }),
        } as Response;
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/student/notifications/page')).default;
    render(<Page />);

    expect(await screen.findByTestId('notifications-heading')).toBeInTheDocument();
    expect(await screen.findByText('Có thông báo mới')).toBeInTheDocument();
    expect(await screen.findByText('1 thông báo chưa đọc')).toBeInTheDocument();
  });

  it('shows success icon for face attendance notifications', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/notifications') {
        return {
          ok: true,
          json: async () => ({
            data: {
              notifications: [
                {
                  id: 2,
                  type: 'success',
                  title: 'Face attendance thành công',
                  message: 'Bạn đã được ghi nhận tham gia bằng face attendance',
                  related_table: 'activities',
                  related_id: 9,
                  is_read: 0,
                  created_at: '2026-04-20T00:00:00Z',
                },
              ],
              meta: { total_unread: 1 },
            },
          }),
        } as Response;
      }
      if (url === '/api/notifications/settings') {
        return {
          ok: true,
          json: async () => ({ data: { settings: { email_enabled: true, new_activity_enabled: true, reminder_enabled: true, reminder_days: 2 } } }),
        } as Response;
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/student/notifications/page')).default;
    render(<Page />);

    expect(await screen.findByText('Face attendance thành công')).toBeInTheDocument();
    expect(screen.getByText('✅')).toBeInTheDocument();
  });

  it('shows teacher-origin notification entries in student inbox', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/notifications') {
        return {
          ok: true,
          json: async () => ({
            data: {
              notifications: [
                {
                  id: 3,
                  type: 'broadcast',
                  title: 'Nhắc điểm danh',
                  message: 'Các em nhớ có mặt đúng giờ',
                  related_table: 'teacher_broadcast',
                  related_id: null,
                  is_read: 0,
                  created_at: '2026-04-20T00:00:00Z',
                },
              ],
              meta: { total_unread: 1 },
            },
          }),
        } as Response;
      }
      if (url === '/api/notifications/settings') {
        return {
          ok: true,
          json: async () => ({ data: { settings: { email_enabled: true, new_activity_enabled: true, reminder_enabled: true, reminder_days: 2 } } }),
        } as Response;
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/student/notifications/page')).default;
    render(<Page />);

    expect(await screen.findByText('Nhắc điểm danh')).toBeInTheDocument();
    expect(screen.getByText('Các em nhớ có mặt đúng giờ')).toBeInTheDocument();
    expect(screen.getByText('💬')).toBeInTheDocument();
  });

  it('surfaces notification fetch errors', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/notifications') {
        return { ok: false, json: async () => ({ error: 'Không thể tải thông báo mới' }) } as Response;
      }
      if (url === '/api/notifications/settings') {
        return { ok: true, json: async () => ({ settings: { email_enabled: true, new_activity_enabled: true, reminder_enabled: true, reminder_days: 1 } }) } as Response;
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/student/notifications/page')).default;
    render(<Page />);

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Không thể tải thông báo mới');
    });
  });
});
