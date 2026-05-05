import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

describe('TeacherManualAttendancePage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
  });

  it('loads activities and fetches students for the selected activity', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/activities?scope=operational&status=ongoing,completed') {
        return {
          ok: true,
          json: async () => ({
            activities: [
              {
                id: 9,
                title: 'Sinh hoat lop dau tuan',
                date_time: '2026-04-22T08:00:00.000Z',
                location: 'Phong A1',
                status: 'ongoing',
              },
            ],
          }),
        } as Response;
      }

      if (url === '/api/attendance/manual?activity_id=9') {
        return {
          ok: true,
          json: async () => ({
            students: [
              {
                id: 1,
                user_id: 201,
                name: 'Nguyen Van A',
                email: 'a@student.edu.vn',
                registration_status: 'registered',
                attendance_status: null,
                achievement_level: null,
              },
            ],
          }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/attendance/page')).default;
    render(<Page />);

    expect(await screen.findByText('Dieu phoi diem danh')).toBeInTheDocument();
    fireEvent.click(await screen.findByText('Sinh hoat lop dau tuan'));

    expect(await screen.findByText('Nguyen Van A')).toBeInTheDocument();
    expect(screen.getByText('Luu manual attendance (0)')).toBeDisabled();
  });

  it('submits manual attendance with the selected students', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/activities?scope=operational&status=ongoing,completed') {
        return {
          ok: true,
          json: async () => ({
            activities: [
              {
                id: 9,
                title: 'Sinh hoat lop dau tuan',
                date_time: '2026-04-22T08:00:00.000Z',
                location: 'Phong A1',
                status: 'ongoing',
              },
            ],
          }),
        } as Response;
      }

      if (url === '/api/attendance/manual?activity_id=9') {
        return {
          ok: true,
          json: async () => ({
            students: [
              {
                id: 1,
                user_id: 201,
                name: 'Nguyen Van A',
                email: 'a@student.edu.vn',
                registration_status: 'registered',
                attendance_status: null,
                achievement_level: null,
              },
            ],
          }),
        } as Response;
      }

      if (url === '/api/attendance/manual' && init?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({ message: 'Da luu diem danh cho 1 hoc vien' }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/attendance/page')).default;
    render(<Page />);

    fireEvent.click(await screen.findByText('Sinh hoat lop dau tuan'));
    expect(await screen.findByText('Nguyen Van A')).toBeInTheDocument();
    const checkbox = await screen.findByRole('checkbox');
    fireEvent.click(checkbox);
    const submitButton = await screen.findByRole('button', {
      name: 'Luu manual attendance (1)',
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Da luu diem danh cho 1 hoc vien');
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/attendance/manual',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
