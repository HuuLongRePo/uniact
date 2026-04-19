import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const backMock = vi.fn();
const toastErrorMock = vi.fn();
const originalUse = React.use;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: backMock }),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
    success: vi.fn(),
  },
}));

describe('StudentNotesPage', () => {
  beforeEach(() => {
    backMock.mockReset();
    toastErrorMock.mockReset();
    (React as any).use = ((value: unknown) => {
      if (value instanceof Promise) {
        return { id: '12' };
      }
      return originalUse(value as any);
    }) as typeof React.use;
  });

  it('reads canonical nested notes payload', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/students/12') {
        return {
          ok: true,
          json: async () => ({
            data: { student: { id: 12, name: 'Nguyễn Văn A', student_code: 'SV001', class_name: 'CNTT K18A' } },
          }),
        } as Response;
      }
      if (url === '/api/students/12/notes') {
        return {
          ok: true,
          json: async () => ({
            data: {
              notes: [
                {
                  id: 1,
                  student_id: 12,
                  teacher_id: 1,
                  content: 'Theo dõi tiến bộ',
                  category: 'academic',
                  is_confidential: false,
                  created_at: '2026-01-01',
                  updated_at: '2026-01-01',
                  created_by: 'Teacher A',
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

    const Page = (await import('../src/app/teacher/students/[id]/notes/page')).default;
    await act(async () => {
      render(<Page params={Promise.resolve({ id: '12' })} />);
    });

    expect(await screen.findByText('Ghi chú - Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.getByText('Theo dõi tiến bộ')).toBeInTheDocument();
  });

  it('surfaces fetch error message when student info fails', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/students/12') {
        return { ok: false, json: async () => ({}) } as Response;
      }
      if (url === '/api/students/12/notes') {
        return { ok: true, json: async () => ({ notes: [] }) } as Response;
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/students/[id]/notes/page')).default;
    await act(async () => {
      render(<Page params={Promise.resolve({ id: '12' })} />);
    });

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Không thể tải thông tin học viên');
    });
  });
});
