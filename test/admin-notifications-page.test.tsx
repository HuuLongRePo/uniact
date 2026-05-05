import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
const useAuthMock = vi.fn();
const notificationInboxMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: useAuthMock,
}));

vi.mock('@/components/notifications/NotificationInbox', () => ({
  default: (props: { title?: string }) => {
    notificationInboxMock(props);
    return <div data-testid="notification-inbox-title">{props.title}</div>;
  },
}));

describe('AdminNotificationsPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    notificationInboxMock.mockReset();
    useAuthMock.mockReset();
    useAuthMock.mockReturnValue({
      user: { id: 1, role: 'admin' },
      loading: false,
    });
  });

  it('passes the clean admin notification title to inbox', async () => {
    const Page = (await import('../src/app/admin/notifications/page')).default;
    render(<Page />);

    expect(screen.getByTestId('notification-inbox-title')).toHaveTextContent(
      'Thong bao quan tri'
    );
    expect(notificationInboxMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Thong bao quan tri' })
    );
  });

  it('redirects non-admin users to login', async () => {
    useAuthMock.mockReturnValue({
      user: { id: 8, role: 'teacher' },
      loading: false,
    });

    const Page = (await import('../src/app/admin/notifications/page')).default;
    render(<Page />);

    expect(pushMock).toHaveBeenCalledWith('/login');
  });
});
