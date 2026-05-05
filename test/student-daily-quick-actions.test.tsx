import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StudentDailyQuickActions from '@/components/student/StudentDailyQuickActions';

let mockPathname = '/student/dashboard';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('StudentDailyQuickActions', () => {
  it('renders canonical quick-action links for student daily flow', () => {
    mockPathname = '/student/dashboard';
    render(<StudentDailyQuickActions />);

    expect(screen.getByTestId('student-daily-quick-actions')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Quét mã QR' })).toHaveAttribute('href', '/student/check-in');
    expect(screen.getByRole('link', { name: 'Hoạt động của tôi' })).toHaveAttribute('href', '/student/my-activities');
    expect(screen.getByRole('link', { name: 'Thông báo' })).toHaveAttribute('href', '/student/notifications');
    expect(screen.getByRole('link', { name: 'Cảnh báo' })).toHaveAttribute('href', '/student/alerts');
    expect(screen.getByRole('link', { name: 'Điểm số' })).toHaveAttribute('href', '/student/scores');
    expect(screen.getByRole('link', { name: 'Khảo sát' })).toHaveAttribute('href', '/student/polls');
    expect(screen.getByRole('link', { name: 'Bảng điều khiển' })).toHaveAttribute('href', '/student/dashboard');
  });

  it('marks current route action as active via aria-current', () => {
    mockPathname = '/student/notifications';
    render(<StudentDailyQuickActions />);

    expect(screen.getByRole('link', { name: 'Thông báo' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Quét mã QR' })).not.toHaveAttribute('aria-current');
  });

  it('keeps parent action active on nested child routes', () => {
    mockPathname = '/student/notifications/history';
    render(<StudentDailyQuickActions />);

    expect(screen.getByRole('link', { name: 'Thông báo' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Bảng điều khiển' })).not.toHaveAttribute('aria-current');
  });

  it('can include optional devices action when requested', () => {
    mockPathname = '/student/devices';
    render(<StudentDailyQuickActions includeDevices />);

    expect(screen.getByRole('link', { name: 'Thiết bị' })).toHaveAttribute('href', '/student/devices');
    expect(screen.getByRole('link', { name: 'Thiết bị' })).toHaveAttribute('aria-current', 'page');
  });
});
