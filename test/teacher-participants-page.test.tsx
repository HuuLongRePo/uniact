import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: '17' }),
}));

vi.mock('@/lib/toast', () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

describe('TeacherParticipantsPage', () => {
  beforeEach(() => {
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
  });

  it('renders canonical participant payload', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/activities/17') {
        return {
          ok: true,
          json: async () => ({
            data: {
              activity: {
                id: 17,
                title: 'Hoat dong huong nghiep',
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
                  id: 500,
                  student_id: 81,
                  student_name: 'Nguyen Van A',
                  student_email: 'a@student.edu.vn',
                  attendance_status: 'attended',
                  achievement_level: null,
                  evaluated_at: null,
                  points: 5,
                },
              ],
            },
          }),
        } as Response;
      }

      if (url === '/api/classes') {
        return {
          ok: true,
          json: async () => ({ data: { classes: [{ id: 1, name: '12A1' }] } }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/activities/[id]/participants/page')).default;
    render(<Page />);

    expect(await screen.findByText('Nguoi tham gia va danh gia')).toBeInTheDocument();
    expect(screen.getByText('Nguyen Van A')).toBeInTheDocument();
    expect(screen.getAllByText('Da diem danh').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /12A1/i })).toBeInTheDocument();
  });
});
