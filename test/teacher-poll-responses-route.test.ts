import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockRequireApiRole: vi.fn(),
  mockDbAll: vi.fn(),
  mockDbGet: vi.fn(),
  mockDbReady: vi.fn(),
  mockEnsurePollSchema: vi.fn(),
}));

vi.mock('@/lib/guards', () => ({
  requireApiRole: mocks.mockRequireApiRole,
}));

vi.mock('@/lib/database', () => ({
  dbAll: mocks.mockDbAll,
  dbGet: mocks.mockDbGet,
  dbReady: mocks.mockDbReady,
}));

vi.mock('@/lib/polls', () => ({
  ensurePollSchema: mocks.mockEnsurePollSchema,
  parsePollId: (value: string) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  },
  csvCell: (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`,
}));

describe('Teacher poll responses routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockRequireApiRole.mockResolvedValue({ id: 12, role: 'teacher' });
    mocks.mockDbReady.mockResolvedValue(undefined);
    mocks.mockEnsurePollSchema.mockResolvedValue(undefined);
  });

  it('returns poll responses and option percentages for owner teacher', async () => {
    mocks.mockDbGet.mockResolvedValue({ id: 7, created_by: 12 });
    mocks.mockDbAll
      .mockResolvedValueOnce([
        {
          id: 101,
          poll_id: 7,
          poll_title: 'Khao sat hoc ky',
          student_id: 501,
          student_name: 'Nguyen Van A',
          class_name: 'CNTT K18A',
          selected_option: 'Co',
          response_text: '',
          responded_at: '2026-04-20T08:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([
        { id: 1, poll_id: 7, option_text: 'Co', response_count: 2 },
        { id: 2, poll_id: 7, option_text: 'Khong', response_count: 1 },
      ]);

    const route = await import('../src/app/api/teacher/polls/[id]/responses/route');
    const response = await route.GET({} as any, { params: Promise.resolve({ id: '7' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.responses).toHaveLength(1);
    expect(body.data.options).toMatchObject([
      { option_text: 'Co', response_count: 2, percentage: 66.7 },
      { option_text: 'Khong', response_count: 1, percentage: 33.3 },
    ]);
  });

  it('blocks non-owner teacher from viewing responses', async () => {
    mocks.mockDbGet.mockResolvedValue({ id: 7, created_by: 99 });

    const route = await import('../src/app/api/teacher/polls/[id]/responses/route');
    const response = await route.GET({} as any, { params: Promise.resolve({ id: '7' }) });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe('FORBIDDEN');
  });

  it('exports filtered responses as csv', async () => {
    mocks.mockDbGet.mockResolvedValue({ id: 7, created_by: 12 });
    mocks.mockDbAll.mockResolvedValue([
      {
        id: 1001,
        student_name: 'Nguyen Van A',
        class_name: 'CNTT K18A',
        selected_option: 'Co',
        response_text: '',
        responded_at: '2026-04-20T08:00:00.000Z',
      },
    ]);

    const route = await import('../src/app/api/teacher/polls/[id]/responses/export/route');
    const response = await route.POST(
      {
        url: 'http://localhost/api/teacher/polls/7/responses/export',
        json: async () => ({
          filters: {
            classId: 'CNTT K18A',
            dateStart: '2026-04-20',
            dateEnd: '2026-04-21',
          },
        }),
      } as any,
      { params: Promise.resolve({ id: '7' }) }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/csv');
    expect(response.headers.get('Content-Disposition')).toContain('poll-responses-7-');

    const csv = await response.text();
    expect(csv).toContain('Nguyen Van A');
    expect(csv).toContain('CNTT K18A');
    expect(mocks.mockDbAll).toHaveBeenCalledWith(
      expect.stringContaining('c.name = ?'),
      [7, 'CNTT K18A', '2026-04-20T00:00:00', '2026-04-21T23:59:59']
    );
  });
});
