import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
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

describe('TeacherPollsPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it('renders canonical poll management snapshot', async () => {
    const polls = [
      {
        id: 9,
        title: 'Khao sat lich hop',
        description: 'Chon khung gio hop lop',
        class_name: 'CTK42A',
        status: 'active',
        response_count: 4,
        created_at: '2026-04-20T08:00:00.000Z',
        allow_multiple: 0,
      },
    ];

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === '/api/teacher/polls') {
        return {
          ok: true,
          json: async () => ({ data: { polls } }),
        } as Response;
      }

      if (url === '/api/teacher/classes') {
        return {
          ok: true,
          json: async () => ({ data: { classes: [{ id: 2, name: 'CTK42A' }] } }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/polls/page')).default;
    render(<Page />);

    expect(await screen.findByText('Khảo sát lớp học')).toBeInTheDocument();
    expect(screen.getByText('Khao sat lich hop')).toBeInTheDocument();
    expect(screen.getByText('Chon khung gio hop lop')).toBeInTheDocument();
    expect(screen.getByText('Báo cáo phản hồi')).toBeInTheDocument();
    expect(screen.getByText('Cài đặt khảo sát')).toBeInTheDocument();
  });
});
