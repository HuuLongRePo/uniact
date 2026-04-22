import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, role: 'teacher' }, loading: false }),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
    success: vi.fn(),
  },
}));

describe('TeacherNotifyStudentsPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    toastErrorMock.mockReset();
  });

  it('reads canonical teacher students payload for notification recipients', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/teacher/students') {
        return {
          ok: true,
          json: async () => ({
            data: {
              students: [
                { id: 12, name: 'Nguyễn Văn A', email: 'a@student.edu.vn', total_points: 20 },
              ],
            },
          }),
        } as Response;
      }
      if (url === '/api/teacher/notifications/history') {
        return { ok: true, json: async () => ({ data: { notifications: [] } }) } as Response;
      }
      if (url === '/api/teacher/notifications/scheduled') {
        return { ok: true, json: async () => ({ data: { notifications: [] } }) } as Response;
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/notify-students/page')).default;
    render(<Page />);

    expect(await screen.findByText('Gửi thông báo cho học viên')).toBeInTheDocument();
    expect(await screen.findByText('Nguyễn Văn A')).toBeInTheDocument();
  });
});
