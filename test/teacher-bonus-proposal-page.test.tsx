import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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

describe('TeacherBonusProposalPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it('filters pending suggestions by author and keeps selection flow usable', async () => {
    const suggestions = [
      {
        id: 1,
        student_id: 12,
        points: 3,
        source_type: 'achievement',
        status: 'pending',
        author_id: 7,
        created_at: '2026-04-20T08:00:00.000Z',
      },
      {
        id: 2,
        student_id: 14,
        points: 8,
        source_type: 'social',
        status: 'pending',
        author_id: 99,
        created_at: '2026-04-20T09:00:00.000Z',
      },
    ];

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === '/api/teacher/students') {
        return {
          ok: true,
          json: async () => ({
            data: {
              students: [
                { id: 12, name: 'Hoc Vien A', email: 'a@example.com', class_name: 'CTK42A' },
                { id: 14, name: 'Hoc Vien B', email: 'b@example.com', class_name: 'CTK42B' },
              ],
            },
          }),
        } as Response;
      }

      if (url === '/api/bonus?status=pending') {
        return {
          ok: true,
          json: async () => ({ data: { suggestions } }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/bonus-proposal/page')).default;
    render(<Page />);

    expect(await screen.findByText('De xuat cong diem')).toBeInTheDocument();
    expect(screen.getByText('+3 diem')).toBeInTheDocument();
    expect(screen.queryByText('+8 diem')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Hoc Vien A/i }));

    expect(await screen.findByText('Hoc vien dang duoc de xuat')).toBeInTheDocument();
    expect(screen.getAllByText('Hoc Vien A').length).toBeGreaterThan(0);
  });
});
