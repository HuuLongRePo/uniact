import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: useAuthMock,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

function buildStudentsPayload(status: 'missing' | 'captured' | 'ready', training: 'not_started' | 'pending' | 'trained') {
  return {
    data: {
      summary: { total: 1, ready_count: 0, missing_count: 1 },
      students: [
        {
          id: 12,
          name: 'Nguyen Van A',
          email: 'a@student.edu.vn',
          student_code: 'SV001',
          class_name: 'CNTT K18A',
          biometric_readiness: {
            runtime_enabled: false,
            enrollment_status: status,
            training_status: training,
            sample_image_count: 5,
            face_attendance_ready: false,
            blocker: 'Face biometric runtime dang bi tat',
          },
        },
      ],
    },
  };
}

describe('AdminBiometricsPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    useAuthMock.mockReset();
    useAuthMock.mockReturnValue({ user: { id: 1, role: 'admin' }, loading: false });
  });

  it('renders per-student biometric readiness list', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => buildStudentsPayload('missing', 'not_started'),
    })) as any;

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/biometrics/page')).default;
    render(<Page />);

    expect(await screen.findByText(/Biometric readiness theo/i)).toBeInTheDocument();
    expect(screen.getByText(/SV001/)).toBeInTheDocument();
  });

  it('allows marking more sample images for enrollment flow', async () => {
    let enrollmentUpdated = false;
    const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
      if (url === '/api/admin/biometrics/students/12/enrollment' && options?.method === 'POST') {
        enrollmentUpdated = true;
        return {
          ok: true,
          json: async () => ({ data: { student_id: 12, sample_image_count: 6 } }),
        } as any;
      }

      return {
        ok: true,
        json: async () =>
          enrollmentUpdated
            ? buildStudentsPayload('captured', 'pending')
            : buildStudentsPayload('missing', 'not_started'),
      } as any;
    }) as any;

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/biometrics/page')).default;
    render(<Page />);

    expect(await screen.findByText(/SV001/)).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button')[0]);

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalled();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/biometrics/students/12/enrollment',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('allows marking training as completed for a student', async () => {
    let trained = false;
    const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
      if (url === '/api/admin/biometrics/students/12/training' && options?.method === 'POST') {
        trained = true;
        return {
          ok: true,
          json: async () => ({ data: { student_id: 12, training_status: 'trained', enrollment_status: 'ready' } }),
        } as any;
      }

      return {
        ok: true,
        json: async () =>
          trained
            ? buildStudentsPayload('ready', 'trained')
            : buildStudentsPayload('captured', 'pending'),
      } as any;
    }) as any;

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/biometrics/page')).default;
    render(<Page />);

    expect(await screen.findByText(/SV001/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /train xong/i }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalled();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/biometrics/students/12/training',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('allows teacher role to access biometric management screen', async () => {
    useAuthMock.mockReturnValue({ user: { id: 7, role: 'teacher' }, loading: false });

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: {
          summary: { total: 0, ready_count: 0, missing_count: 0 },
          students: [],
          scope: 'teacher_homeroom',
        },
      }),
    })) as any;

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/biometrics/page')).default;
    render(<Page />);

    expect(await screen.findByText(/Biometric readiness theo/i)).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/biometrics/students');
  });
});
