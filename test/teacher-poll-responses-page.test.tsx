import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const toastErrorMock = vi.fn();

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
    success: vi.fn(),
  },
}));

describe('PollResponsesPage', () => {
  beforeEach(() => {
    toastErrorMock.mockReset();
  });

  it('reads canonical nested polls and responses payloads', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === '/api/teacher/polls') {
        return {
          ok: true,
          json: async () => ({ data: { polls: [{ id: 7, title: 'Khảo sát học kỳ', status: 'closed' }] } }),
        } as Response;
      }

      if (url === '/api/teacher/polls/7/responses') {
        return {
          ok: true,
          json: async () => ({
            data: {
              responses: [{ id: 1, poll_id: 7, poll_title: 'Khảo sát học kỳ', student_id: 1, student_name: 'Nguyễn Văn A', class_name: 'CNTT K18A', selected_option: 'Có', response_text: '', responded_at: '2026-04-19T10:00:00Z' }],
              options: [{ id: 1, poll_id: 7, option_text: 'Có', response_count: 1, percentage: 100 }],
            },
          }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/polls/responses/page')).default;
    render(<Page />);

    expect(await screen.findByText('Phân tích phản hồi bình chọn')).toBeInTheDocument();
    expect(await screen.findByText('Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.getByText('Kết quả tùy chọn')).toBeInTheDocument();
  });

  it('surfaces nested API error messages for poll responses', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === '/api/teacher/polls') {
        return {
          ok: true,
          json: async () => ({ polls: [{ id: 7, title: 'Khảo sát học kỳ', status: 'closed' }] }),
        } as Response;
      }

      if (url === '/api/teacher/polls/7/responses') {
        return {
          ok: false,
          json: async () => ({ message: 'Không thể tải phản hồi bình chọn' }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/polls/responses/page')).default;
    render(<Page />);

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Không thể tải phản hồi bình chọn');
    });
  });
});
