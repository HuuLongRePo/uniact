import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

describe('NotificationInbox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders notifications and pagination metadata from canonical payload', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: {
          notifications: [
            {
              id: 1,
              type: 'system',
              title: 'Có thông báo mới',
              message: 'Nội dung test',
              related_table: null,
              related_id: null,
              is_read: 0,
              created_at: '2026-04-21T08:00:00.000Z',
            },
          ],
          meta: {
            total_unread: 1,
            total: 25,
            page: 1,
            per_page: 20,
          },
        },
      }),
    }));

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const NotificationInbox = (await import('../src/components/notifications/NotificationInbox'))
      .default;
    render(<NotificationInbox title="Thông báo giảng viên" />);

    expect(await screen.findByTestId('notifications-heading')).toBeInTheDocument();
    expect(await screen.findByText('Có thông báo mới')).toBeInTheDocument();
    expect(screen.getByText('Trang 1/2')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/notifications');
  });

  it('requests unread filter with pagination reset', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            notifications: [],
            meta: { total_unread: 0, total: 0, page: 1, per_page: 20 },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            notifications: [],
            meta: { total_unread: 3, total: 3, page: 1, per_page: 20 },
          },
        }),
      });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const NotificationInbox = (await import('../src/components/notifications/NotificationInbox'))
      .default;
    render(<NotificationInbox />);

    const unreadTab = await screen.findByRole('button', { name: /chưa đọc/i });
    fireEvent.click(unreadTab);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/notifications?unread=1');
    });
  });

  it('injects canonical student attendance CTA even when payload provides custom actions', async () => {
    window.history.pushState({}, '', '/student/notifications');
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: {
          notifications: [
            {
              id: 17,
              type: 'attendance_qr_started',
              title: 'Đang mở điểm danh',
              message: 'Giảng viên đã mở mã QR',
              related_table: 'activities',
              related_id: 33,
              is_read: 0,
              created_at: '2026-04-21T08:00:00.000Z',
              action_buttons: [
                {
                  id: 'view_activity',
                  label: 'Xem chi tiết',
                  action: 'open_link',
                  href: '/student/activities/33',
                },
              ],
            },
          ],
          meta: {
            total_unread: 1,
            total: 1,
            page: 1,
            per_page: 20,
          },
        },
      }),
    }));

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const NotificationInbox = (await import('../src/components/notifications/NotificationInbox'))
      .default;
    render(<NotificationInbox />);

    expect(await screen.findByText('Đang mở điểm danh')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /QR/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Xem chi tiết/i })).toBeInTheDocument();
  });

  it('opens settings in an accessible dialog when enabled', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === '/api/notifications/settings') {
        return {
          ok: true,
          json: async () => ({
            data: {
              settings: {
                email_enabled: true,
                new_activity_enabled: true,
                reminder_enabled: true,
                reminder_days: 2,
              },
            },
          }),
        };
      }

      return {
        ok: true,
        json: async () => ({
          data: {
            notifications: [],
            meta: {
              total_unread: 0,
              total: 0,
              page: 1,
              per_page: 20,
            },
          },
        }),
      };
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const NotificationInbox = (await import('../src/components/notifications/NotificationInbox'))
      .default;
    render(<NotificationInbox showSettings />);

    fireEvent.click(await screen.findByRole('button', { name: 'Cài đặt' }));
    expect(await screen.findByRole('dialog', { name: 'Cài đặt thông báo' })).toBeInTheDocument();
  });
});
