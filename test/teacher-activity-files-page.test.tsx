import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useParams: () => ({ id: '17' }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, role: 'teacher' }, loading: false }),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
    success: toastSuccessMock,
    loading: vi.fn(() => 'toast-id'),
  },
}));

describe('ActivityFilesPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
  });

  it('renders canonical file list payload', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/activities/17/files') {
        return {
          ok: true,
          json: async () => ({
            data: {
              activity_title: 'Hoat dong ky nang song',
              files: [
                {
                  id: 1,
                  activity_id: 17,
                  file_path: '/uploads/activities/17/photo.png',
                  file_name: 'photo.png',
                  file_size: 2048,
                  file_type: 'image/png',
                  uploaded_at: '2026-04-22T08:05:00.000Z',
                  uploaded_by: 'Teacher A',
                },
                {
                  id: 2,
                  activity_id: 17,
                  file_path: '/uploads/activities/17/list.pdf',
                  file_name: 'list.pdf',
                  file_size: 4096,
                  file_type: 'application/pdf',
                  uploaded_at: '2026-04-22T08:06:00.000Z',
                  uploaded_by: 'Teacher A',
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

    const Page = (await import('../src/app/teacher/activities/[id]/files/page')).default;
    render(<Page />);

    expect(await screen.findByText('Quan ly tep dinh kem')).toBeInTheDocument();
    expect(screen.getByText('Hoat dong ky nang song')).toBeInTheDocument();
    expect(screen.getByText('photo.png')).toBeInTheDocument();
    expect(screen.getByText('list.pdf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tai tep len' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Xem truoc' }));
    expect(await screen.findByRole('dialog', { name: 'photo.png' })).toBeInTheDocument();
  });
});
