import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useParams: () => ({ id: '17' }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, role: 'teacher' }, loading: false }),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

describe('TeacherBulkAttendancePage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
  });

  it('renders canonical bulk attendance roster', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/activities/17') {
        return {
          ok: true,
          json: async () => ({
            data: {
              activity: {
                id: 17,
                title: 'Hoat dong ky nang song',
                date_time: '2026-04-22T08:00:00.000Z',
                location: 'Hoi truong',
                status: 'published',
              },
            },
          }),
        } as Response;
      }

      if (url === '/api/activities/17/participants') {
        return {
          ok: true,
          json: async () => ({
            data: {
              participations: [
                {
                  id: 501,
                  student_id: 81,
                  student_name: 'Nguyen Van A',
                  student_email: 'a@student.edu.vn',
                  student_code: 'SV001',
                  class_name: '12A1',
                  attendance_status: 'attended',
                  notes: 'Co mat tu som',
                },
              ],
            },
          }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/activities/[id]/attendance/bulk/page')).default;
    render(<Page />);

    expect((await screen.findAllByText('Điểm danh hàng loạt')).length).toBeGreaterThan(0);
    expect(screen.getByText('Nguyen Van A')).toBeInTheDocument();
    expect(screen.getAllByText('Có mặt').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Lưu điểm danh (1)' })).toBeInTheDocument();
  });
});
