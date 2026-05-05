import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

describe('TeacherClassManagementPage', () => {
  beforeEach(() => {
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
  });

  it('loads classes and shows readonly banner for assistant class', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === '/api/teacher/classes') {
        return {
          ok: true,
          json: async () => ({
            classes: [
              {
                id: 1,
                name: 'CTK42A',
                grade: 'K42',
                studentCount: 2,
                isHomeroomClass: true,
                teacherClassRole: 'primary',
                canEdit: true,
              },
              {
                id: 2,
                name: 'CTK42B',
                grade: 'K42',
                studentCount: 1,
                isHomeroomClass: false,
                teacherClassRole: 'assistant',
                canEdit: false,
              },
            ],
          }),
        } as Response;
      }

      if (url === '/api/teacher/classes/1/students') {
        return {
          ok: true,
          json: async () => ({
            students: [
              {
                id: 11,
                name: 'Hoc Vien A',
                email: 'a@student.edu.vn',
                totalPoints: 15,
                attendedActivities: 3,
              },
            ],
          }),
        } as Response;
      }

      if (url === '/api/teacher/classes/2/students') {
        return {
          ok: true,
          json: async () => ({
            students: [
              {
                id: 12,
                name: 'Hoc Vien B',
                email: 'b@student.edu.vn',
                totalPoints: 10,
                attendedActivities: 2,
              },
            ],
          }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/classes/page')).default;
    render(<Page />);

    expect(await screen.findByTestId('classes-heading')).toHaveTextContent('Quan ly lop hoc');
    expect((await screen.findAllByText('Hoc Vien A')).length).toBeGreaterThan(0);
    expect(screen.getByText('Chu nhiem')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Them hoc vien' }));
    expect(await screen.findByRole('dialog', { name: 'Them hoc vien vao lop' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dong' }));

    fireEvent.click(screen.getByRole('button', { name: /ctk42b/i }));

    expect((await screen.findAllByText('Hoc Vien B')).length).toBeGreaterThan(0);
    expect(
      screen.getByText('Ban co the xem thong tin lop nay, nhung chi lop chu nhiem moi duoc thay doi roster.')
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/teacher/classes/2/students');
    });
  });
});
