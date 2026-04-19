import React from 'react';
import { render, screen } from '@testing-library/react';
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
          json: async () => ({ data: { activities: [{ id: 1, title: 'Pilot Activity', status: 'published', approval_status: 'approved', max_participants: 50 }] } }),
        } as Response;
      }
      if (url === '/api/activities/1/attendance-policy') {
        return {
          ok: true,
          json: async () => ({
            data: {
              activity: { id: 1, title: 'Pilot Activity' },
              counts: { participation_count: 30, mandatory_class_count: 1, voluntary_class_count: 0 },
              policy: {
                version: 'v1',
                defaultMode: 'qr',
                qrFallback: { preset: 'balanced', responseTimeP95Ms: 1700, queueBacklog: 30, scanFailureRate: 0.2, minSampleSize: 25, allowTeacherManualOverride: true },
                facePilot: { eligible: true, recommendedMode: 'mixed', preferredPrimaryMethod: 'face', reasons: ['pilot'], teacherManualOverride: true, minConfidenceScore: 0.82, selectionMode: 'selected_or_heuristic', selectedByConfig: true },
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

  it('shows runtime disabled readiness guidance', async () => {
    const Page = (await import('../src/app/teacher/attendance/policy/page')).default;
    render(<Page />);

    expect(await screen.findByTestId('attendance-policy-heading')).toBeInTheDocument();
    expect(
      await screen.findByText(/Runtime nhận diện khuôn mặt hiện chưa được bật trong bản phát hành này/i)
    ).toBeInTheDocument();
  });
});
