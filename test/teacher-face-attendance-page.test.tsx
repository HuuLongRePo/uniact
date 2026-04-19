import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('react-hot-toast', () => ({
  default: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

describe('TeacherFaceAttendancePage', () => {
  beforeEach(() => {
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
  });

  it('creates candidate preview payload for face attendance', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            candidate_embedding: [0.1, 0.2, 0.3],
            quality_score: 75,
            liveness_score: 0.91,
            verification_method: 'candidate_embedding',
            upstream_verified: false,
          },
        }),
      }) as any;

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/attendance/face/page')).default;
    render(<Page />);

    fireEvent.click(screen.getByRole('button', { name: 'Tạo candidate preview' }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Đã tạo candidate preview');
    });

    expect(screen.getByText(/candidate_embedding/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/biometric/candidate-preview', expect.objectContaining({ method: 'POST' }));
  });

  it('submits face attendance after candidate preview is ready', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            candidate_embedding: [0.1, 0.2, 0.3],
            quality_score: 75,
            liveness_score: 0.91,
            verification_method: 'candidate_embedding',
            upstream_verified: false,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            recorded: true,
            verification_source: 'runtime_bridge',
            verification_method: 'candidate_embedding',
            runtime_mode: 'runtime_ready',
          },
        }),
      }) as any;

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/teacher/attendance/face/page')).default;
    render(<Page />);

    fireEvent.click(screen.getByRole('button', { name: 'Tạo candidate preview' }));
    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Đã tạo candidate preview');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Gửi face attendance' }));
    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Đã gửi face attendance thành công');
    });

    expect(screen.getByText(/verification_source/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/attendance/face', expect.objectContaining({ method: 'POST' }));
  });
});
