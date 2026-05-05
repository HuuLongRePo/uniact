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

describe('SystemHealthPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it('renders biometric readiness status inside system health', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/admin/system-health') {
        return {
          ok: true,
          json: async () => ({
            database: { size_mb: '12.5', table_count: 20 },
            users: { total: 10, students: 7, teachers: 2, admins: 1, new_24h: 0 },
            activities: {
              total: 4,
              planned: 1,
              ongoing: 1,
              completed: 2,
              cancelled: 0,
              new_24h: 0,
            },
            participations: { total: 20, pending: 1, approved: 18, rejected: 1, new_24h: 0 },
            attendance: { total: 15, attended: 12, absent: 3, new_24h: 0, rate: '80' },
            classes: { total: 3 },
            awards: { total: 2 },
            system: {
              uptime_hours: 5,
              memory: { heap_used_mb: '100', heap_total_mb: '200' },
              node_version: 'v22',
              platform: 'win32',
            },
            top_activities: [],
            recent_errors: [],
            timestamp: '2026-04-19T15:00:00Z',
          }),
        } as Response;
      }
      if (url === '/api/admin/biometrics/readiness') {
        return {
          ok: true,
          json: async () => ({
            data: {
              readiness: {
                runtime_enabled: false,
                runtime_mode: 'stubbed',
                model_loading_ready: false,
                model_loading_status: 'pending',
                embedding_detection_ready: false,
                liveness_check_ready: false,
                liveness_status: 'runtime_unavailable',
                enrollment_flow_ready: false,
                embedding_storage_ready: false,
                training_route_ready: false,
                face_attendance_route_ready: true,
                total_students: 7,
                students_ready_for_face_attendance: 0,
                blockers: ['Face biometric runtime dang bi tat'],
                recommended_next_batch: 'student_image_enrollment_and_training_groundwork',
              },
            },
          }),
        } as Response;
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;

    const Page = (await import('../src/app/admin/system-health/page')).default;
    render(<Page />);

    expect(await screen.findByRole('heading', { name: 'Tinh trang he thong' })).toBeInTheDocument();
    expect(screen.getByTestId('admin-biometric-readiness')).toBeInTheDocument();
    expect(screen.getByText('Biometric readiness')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('runtime_unavailable')).toBeInTheDocument();
    expect(screen.getByText('stubbed')).toBeInTheDocument();
    expect(
      screen.getByText(/student_image_enrollment_and_training_groundwork/i)
    ).toBeInTheDocument();
  });
});
