import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, role: 'admin' }, loading: false }),
}));

describe('AdminBiometricsPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it('renders per-student biometric readiness list', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: {
          summary: { total: 1, ready_count: 0, missing_count: 1 },
          students: [
            {
              id: 12,
              name: 'Nguyễn Văn A',
              email: 'a@student.edu.vn',
              student_code: 'SV001',
              class_name: 'CNTT K18A',
              biometric_readiness: {
                runtime_enabled: false,
                enrollment_status: 'missing',
                training_status: 'not_started',
                face_attendance_ready: false,
                blocker: 'Face biometric runtime đang bị tắt',
              },
            },
          ],
        },
      }),
    })) as any;

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/biometrics/page')).default;
    render(<Page />);

    expect(await screen.findByText('Biometric readiness theo học viên')).toBeInTheDocument();
    expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.getByText('missing')).toBeInTheDocument();
    expect(screen.getByText('not_started')).toBeInTheDocument();
  });
});
