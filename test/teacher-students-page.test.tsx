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

  it('surfaces fetch errors and uses the broadened teacher visibility copy', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: 'Không thể tải dữ liệu học viên' }),
    })) as any;

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/students/page')).default;
    render(<Page />);

    expect(
      await screen.findByText('Theo dõi học viên trên các lớp và phạm vi hoạt động bạn đang quản lý')
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Không thể tải dữ liệu học viên');
    });
  });
});
