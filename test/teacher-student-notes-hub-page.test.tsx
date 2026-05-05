import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 7, role: 'teacher', name: 'Teacher A' },
    loading: false,
  }),
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('TeacherStudentNotesPage', () => {
  beforeEach(() => {
    replaceMock.mockReset();
  });

  it('renders notes from canonical nested payload', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === '/api/teacher/notes') {
        return {
          ok: true,
          json: async () => ({
            data: {
              notes: [
                {
                  id: 1,
                  studentId: 12,
                  studentName: 'Hoc Vien A',
                  studentEmail: 'a@example.com',
                  className: 'CTK42A',
                  content: 'Can theo doi tien do bai tap nhom.',
                  category: 'academic',
                  createdAt: '2026-04-20T08:00:00.000Z',
                  updatedAt: '2026-04-20T08:00:00.000Z',
                },
              ],
            },
          }),
        } as Response;
      }

      if (url === '/api/teacher/students') {
        return {
          ok: true,
          json: async () => ({
            data: {
              students: [{ id: 12, name: 'Hoc Vien A', email: 'a@example.com', class_name: 'CTK42A' }],
            },
          }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/students/notes/page')).default;
    render(<Page />);

    expect(await screen.findByText('So tay hoc vien')).toBeInTheDocument();
    expect(screen.getAllByText('Hoc Vien A').length).toBeGreaterThan(0);
    expect(screen.getByText('Can theo doi tien do bai tap nhom.')).toBeInTheDocument();
    expect(screen.getAllByText('CTK42A').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Them ghi chu' }));
    expect(await screen.findByRole('dialog', { name: 'Them ghi chu moi' })).toBeInTheDocument();
  });
});
