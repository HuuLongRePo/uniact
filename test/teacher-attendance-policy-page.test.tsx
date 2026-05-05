import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/client-fetch-url', () => ({
  resolveClientFetchUrl: (value: string) => value,
}));

describe('TeacherAttendancePolicyPage', () => {
  beforeEach(() => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === '/api/teacher/attendance/pilot-activities') {
        return {
          ok: true,
          json: async () => ({
            data: {
              activities: [
                {
                  id: 1,
                  title: 'Pilot Activity',
                  status: 'published',
                  approval_status: 'approved',
                  max_participants: 50,
                },
              ],
            },
          }),
        } as Response;
      }

      if (url === '/api/activities/1/attendance-policy') {
        return {
          ok: true,
          json: async () => ({
            data: {
              activity: { id: 1, title: 'Pilot Activity' },
              counts: {
                participation_count: 30,
                mandatory_class_count: 1,
                voluntary_class_count: 0,
              },
              policy: {
                version: 'v1',
                defaultMode: 'qr',
                qrFallback: {
                  preset: 'balanced',
                  responseTimeP95Ms: 1700,
                  queueBacklog: 30,
                  scanFailureRate: 0.2,
                  minSampleSize: 25,
                  allowTeacherManualOverride: true,
                },
                facePilot: {
                  eligible: true,
                  recommendedMode: 'mixed',
                  preferredPrimaryMethod: 'face',
                  reasons: ['pilot'],
                  teacherManualOverride: true,
                  minConfidenceScore: 0.82,
                  selectionMode: 'selected_or_heuristic',
                  selectedByConfig: true,
                },
              },
            },
          }),
        } as Response;
      }

      if (url === '/api/activities/1/attendance-policy/fallback') {
        return {
          ok: true,
          json: async () => ({
            data: {
              activity: { id: 1, title: 'Pilot Activity' },
              metrics: {
                responseTimeP95Ms: 2400,
                queueBacklog: 60,
                scanFailureRate: 0.35,
                sampleSize: 32,
              },
              fallback: {
                triggered: true,
                reasons: ['Queue backlog vuot nguong'],
                recommended_target_mode: 'mixed',
                teacher_manual_override: true,
              },
            },
          }),
        } as Response;
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);
    window.fetch = fetchMock as typeof fetch;
  });

  it('shows readiness guidance, pilot eligibility and fallback evaluation', async () => {
    const Page = (await import('../src/app/teacher/attendance/policy/page')).default;
    render(<Page />);

    expect(await screen.findByTestId('attendance-policy-heading')).toBeInTheDocument();
    expect(
      await screen.findByText(
        /Runtime nhan dien khuon mat hien chua duoc bat trong ban phat hanh nay/i
      )
    ).toBeInTheDocument();
    expect(await screen.findByTestId('face-pilot-eligibility')).toHaveTextContent('Eligible');
    expect(screen.getByText('Pilot Activity')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Danh gia fallback' }));

    await waitFor(() => {
      expect(screen.getByTestId('fallback-status')).toHaveTextContent('Nên fallback');
    });
    expect(screen.getByText(/Queue backlog vuot nguong/i)).toBeInTheDocument();
  });
});
