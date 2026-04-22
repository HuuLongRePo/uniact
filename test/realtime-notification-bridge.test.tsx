import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const toastCustomMock = vi.fn();
const toastDismissMock = vi.fn();
const authState = vi.hoisted(() => ({
  user: { id: 7, role: 'student' as 'student' | 'teacher' | 'admin' },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: authState.user }),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    custom: toastCustomMock,
    dismiss: toastDismissMock,
  },
}));

class MockEventSource {
  static instances: MockEventSource[] = [];
  readonly url: string;
  readonly listeners = new Map<string, Array<(event: MessageEvent) => void>>();
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, callback: (event: MessageEvent) => void) {
    const existing = this.listeners.get(type) || [];
    this.listeners.set(type, [...existing, callback]);
  }

  emit(type: string, payload: unknown) {
    const callbacks = this.listeners.get(type) || [];
    const event = {
      data: JSON.stringify(payload),
    } as MessageEvent;

    callbacks.forEach((callback) => callback(event));
  }

  close() {}
}

describe('RealtimeNotificationBridge', () => {
  beforeEach(() => {
    toastCustomMock.mockReset();
    toastDismissMock.mockReset();
    MockEventSource.instances = [];
    authState.user = { id: 7, role: 'student' };

    vi.stubGlobal('EventSource', MockEventSource as unknown as typeof EventSource);

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: { notifications: [] } }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;
  });

  it('shows toast with SSE payload and applies TTL by priority', async () => {
    const Bridge = (await import('../src/components/realtime/RealtimeNotificationBridge'))
      .RealtimeNotificationBridge;

    render(<Bridge />);

    expect(MockEventSource.instances).toHaveLength(1);
    const source = MockEventSource.instances[0];

    source.emit('notification', {
      event_id: 123,
      event_type: 'attendance_started',
      actor_id: 9,
      target_user_ids: [7],
      priority: 'high',
      ttl_seconds: 10,
      action_buttons: [{ id: 'join', label: 'Tham gia', action: 'join', href: '/student/activities' }],
      notification: {
        id: 555,
        type: 'system',
        title: 'Bat dau diem danh',
        message: 'Moi ban vao phien diem danh',
        related_table: 'activities',
        related_id: 88,
        created_at: '2026-04-21T08:00:00.000Z',
      },
      created_at: '2026-04-21T08:00:00.000Z',
    });

    await waitFor(() => {
      expect(toastCustomMock).toHaveBeenCalled();
    });

    expect(toastCustomMock.mock.calls[0][1]).toMatchObject({
      id: 'realtime-notification-123',
      duration: 10000,
    });
  });

  it('falls back to detail + dismiss buttons when payload has no actions', async () => {
    const Bridge = (await import('../src/components/realtime/RealtimeNotificationBridge'))
      .RealtimeNotificationBridge;

    render(<Bridge />);
    const source = MockEventSource.instances[0];

    source.emit('notification', {
      event_id: 124,
      event_type: 'notification.polling',
      actor_id: null,
      target_user_ids: [7],
      priority: 'normal',
      ttl_seconds: 7,
      action_buttons: [],
      notification: {
        id: 556,
        type: 'system',
        title: 'Co thong bao moi',
        message: 'Mo hoat dong de xem chi tiet',
        related_table: 'activities',
        related_id: 91,
        created_at: '2026-04-21T08:05:00.000Z',
      },
      created_at: '2026-04-21T08:05:00.000Z',
    });

    await waitFor(() => {
      expect(toastCustomMock).toHaveBeenCalled();
    });

    const renderFn = toastCustomMock.mock.calls[0][0] as (toastItem: { id: string }) => React.ReactNode;
    render(<>{renderFn({ id: 'toast-1' })}</>);

    expect(screen.getByText('Xem chi tiết')).toBeInTheDocument();
    expect(screen.getByText('Bỏ qua')).toBeInTheDocument();
  });

  it('suppresses duplicate toast payloads with the same content in a short window', async () => {
    const Bridge = (await import('../src/components/realtime/RealtimeNotificationBridge'))
      .RealtimeNotificationBridge;

    render(<Bridge />);
    const source = MockEventSource.instances[0];

    const duplicatedPayload = {
      event_id: 301,
      event_type: 'attendance_started',
      actor_id: 1,
      target_user_ids: [7],
      priority: 'normal' as const,
      ttl_seconds: 7,
      action_buttons: [],
      notification: {
        id: null,
        type: 'attendance',
        title: 'Bat dau diem danh',
        message: 'Hoat dong da mo QR',
        related_table: 'activities',
        related_id: 77,
        created_at: '2026-04-22T09:00:00.000Z',
      },
      created_at: '2026-04-22T09:00:00.000Z',
    };

    source.emit('notification', duplicatedPayload);
    source.emit('notification', { ...duplicatedPayload, event_id: 302 });

    await waitFor(() => {
      expect(toastCustomMock).toHaveBeenCalledTimes(1);
    });
  });

  it('suppresses duplicate content across realtime and polling event types', async () => {
    const Bridge = (await import('../src/components/realtime/RealtimeNotificationBridge'))
      .RealtimeNotificationBridge;

    render(<Bridge />);
    const source = MockEventSource.instances[0];

    source.emit('notification', {
      event_id: 401,
      event_type: 'attendance_qr_started',
      actor_id: 12,
      target_user_ids: [7],
      priority: 'normal',
      ttl_seconds: 7,
      action_buttons: [],
      notification: {
        id: null,
        type: 'attendance',
        title: 'Bat dau diem danh',
        message: 'Lop A1 da mo QR',
        related_table: 'activities',
        related_id: 88,
        created_at: '2026-04-22T10:00:00.000Z',
      },
      created_at: '2026-04-22T10:00:00.000Z',
    });

    source.emit('notification', {
      event_id: 402,
      event_type: 'notification.polling',
      actor_id: null,
      target_user_ids: [7],
      priority: 'normal',
      ttl_seconds: 7,
      action_buttons: [],
      notification: {
        id: null,
        type: 'attendance',
        title: 'Bat dau diem danh',
        message: 'Lop A1 da mo QR',
        related_table: 'activities',
        related_id: 88,
        created_at: '2026-04-22T10:00:03.000Z',
      },
      created_at: '2026-04-22T10:00:03.000Z',
    });

    await waitFor(() => {
      expect(toastCustomMock).toHaveBeenCalledTimes(1);
    });
  });

  it.each(['student', 'teacher', 'admin'] as const)(
    'connects and receives realtime notification for %s role',
    async (role) => {
      authState.user = { id: 70, role };
      const Bridge = (await import('../src/components/realtime/RealtimeNotificationBridge'))
        .RealtimeNotificationBridge;

      render(<Bridge />);

      expect(MockEventSource.instances).toHaveLength(1);
      const source = MockEventSource.instances[0];
      expect(source.url).toBe('/api/notifications/stream');

      source.emit('notification', {
        event_id: 200,
        event_type: 'role_realtime_notification',
        actor_id: 1,
        target_user_ids: [70],
        priority: 'normal',
        ttl_seconds: 7,
        action_buttons: [],
        notification: {
          id: 900,
          type: 'system',
          title: `Role ${role} notification`,
          message: 'Realtime role coverage',
          related_table: null,
          related_id: null,
          created_at: '2026-04-21T09:00:00.000Z',
        },
        created_at: '2026-04-21T09:00:00.000Z',
      });

      await waitFor(() => {
        expect(toastCustomMock).toHaveBeenCalled();
      });
    }
  );
});
