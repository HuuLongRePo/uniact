import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@/types/database';
import StudentRankingPage from '@/app/student/ranking/page';
import { useAuth } from '@/contexts/AuthContext';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/student/ranking',
}));

vi.mock('@/components/LoadingSpinner', () => ({
  default: () => <div data-testid="loading-spinner">Loading</div>,
}));

function createAuthState(role: string = 'student') {
  return {
    user: { id: 1, role, name: 'Current Student' } as User,
    loading: false,
    login: vi.fn(async () => undefined),
    logout: vi.fn(async () => undefined),
    register: vi.fn(async () => undefined),
  };
}

describe('StudentRankingPage', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(createAuthState());
  });

  it('renders scoreboard students payload and highlights the current student', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        students: [
          {
            id: 7,
            name: 'Student A',
            class_name: 'CNTT K18A',
            total_score: 88,
            activities_count: 6,
          },
          {
            id: 1,
            name: 'Current Student',
            class_name: 'CNTT K18A',
            total_score: 77,
            activities_count: 5,
          },
        ],
        meta: {
          total: 2,
          page: 1,
          per_page: 20,
          total_pages: 1,
        },
      }),
    }));

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    render(<StudentRankingPage />);

    expect(await screen.findByText('Bảng xếp hạng')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bảng điểm' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lịch sử tham gia' })).toBeInTheDocument();
    expect((await screen.findAllByText('Current Student')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bạn').length).toBeGreaterThan(0);
    expect(screen.getAllByText('77').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Loc theo lop/i)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/scoreboard?page=1&per_page=20&order=desc');
    });
  });
});
