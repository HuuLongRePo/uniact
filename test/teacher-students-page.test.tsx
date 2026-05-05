import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, role: 'teacher', name: 'Teacher A' },
    loading: false,
  }),
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    error: toastErrorMock,
  },
}));

describe('TeacherStudentsPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    toastErrorMock.mockReset();
  });

  it('surfaces fetch errors for teacher students API', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: 'Không thể tải dữ liệu học viên' }),
    })) as any;

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/students/page')).default;
    render(<Page />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/teacher/students');
    });

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalled();
    });
  });

  it('shows homeroom marker when API marks student in homeroom scope', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: {
          students: [
            {
              id: 11,
              full_name: 'Học Viên Chủ Nhiệm',
              name: 'Học Viên Chủ Nhiệm',
              email: 'hocvien@annd.edu.vn',
              class_id: 3,
              class_name: 'D31A',
              student_code: 'SV001',
              activity_count: 2,
              total_score: 80,
              attended_count: 0,
              is_homeroom_scope: true,
            },
          ],
          classes: [
            {
              id: 3,
              name: 'D31A',
              grade: 'K31',
              is_homeroom_class: true,
            },
          ],
        },
      }),
    })) as any;

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/students/page')).default;
    render(<Page />);

    expect((await screen.findAllByText('Học Viên Chủ Nhiệm')).length).toBeGreaterThan(0);
    expect((await screen.findAllByTitle(/chủ nhiệm/i)).length).toBeGreaterThan(0);
  });
});
