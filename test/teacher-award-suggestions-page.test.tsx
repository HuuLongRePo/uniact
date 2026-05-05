import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AwardSuggestionsPage from '@/app/teacher/awards/suggestions/page';

const { toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

describe('AwardSuggestionsPage', () => {
  beforeEach(() => {
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
  });

  it('loads canonical teacher award suggestion data, creates and deletes a suggestion', async () => {
    let suggestions = [
      {
        id: 11,
        student_id: 7,
        student_name: 'Tran B',
        student_email: 'tranb@example.com',
        class_name: 'C1',
        award_type_id: 3,
        award_type_name: 'Xuat sac',
        award_min_points: 80,
        score_snapshot: 88,
        status: 'pending',
        note: '',
        suggested_at: '2026-05-01T08:00:00.000Z',
      },
    ];

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.startsWith('/api/teacher/award-suggestions?status=')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: { suggestions },
          }),
        } as Response;
      }

      if (url === '/api/teacher/students') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              students: [
                { id: 7, full_name: 'Tran B', class_name: 'C1', total_points: 88 },
                { id: 8, full_name: 'Le C', class_name: 'C2', total_points: 75 },
              ],
            },
          }),
        } as Response;
      }

      if (url === '/api/teacher/award-types') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              awardTypes: [
                { id: 3, name: 'Xuat sac', description: 'Vuot moc 80 diem', min_points: 80 },
                { id: 4, name: 'Tot', description: 'On dinh va noi bat', min_points: 60 },
              ],
            },
          }),
        } as Response;
      }

      if (url === '/api/teacher/award-suggestions' && init?.method === 'POST') {
        expect(JSON.parse(String(init.body))).toMatchObject({
          student_id: 8,
          award_type_id: 4,
        });
        suggestions = [
          ...suggestions,
          {
            id: 12,
            student_id: 8,
            student_name: 'Le C',
            student_email: '',
            class_name: 'C2',
            award_type_id: 4,
            award_type_name: 'Tot',
            award_min_points: 60,
            score_snapshot: 75,
            status: 'pending',
            note: '',
            suggested_at: '2026-05-01T09:00:00.000Z',
          },
        ];
        return {
          ok: true,
          json: async () => ({
            success: true,
            message: 'Tao de xuat khen thuong thanh cong',
            data: { suggestion_id: 12 },
          }),
        } as Response;
      }

      if (url === '/api/teacher/award-suggestions/11' && init?.method === 'DELETE') {
        suggestions = suggestions.filter((item) => item.id !== 11);
        return {
          ok: true,
          json: async () => ({
            success: true,
            message: 'Xoa de xuat khen thuong thanh cong',
            data: {},
          }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    render(<AwardSuggestionsPage />);

    expect(await screen.findByText('De xuat khen thuong')).toBeInTheDocument();
    expect(screen.getByText('Tran B')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Hoc vien'), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText('Loai khen thuong'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tao de xuat' }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Tao de xuat khen thuong thanh cong');
    });

    expect(await screen.findByText('Le C')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Xoa de xuat' })[0] as HTMLButtonElement);
    fireEvent.click(screen.getAllByRole('button', { name: 'Xoa de xuat' }).at(-1) as HTMLButtonElement);

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenLastCalledWith('Xoa de xuat khen thuong thanh cong');
    });

    expect(screen.queryByText('Tran B')).not.toBeInTheDocument();
  });
});
