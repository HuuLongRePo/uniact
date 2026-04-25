import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockRequireApiAuth: vi.fn(),
  mockRequireApiRole: vi.fn(),
  mockDbAll: vi.fn(),
  mockDbGet: vi.fn(),
  mockDbRun: vi.fn(),
  mockDbReady: vi.fn(),
  mockEnsurePollSchema: vi.fn(),
}));

vi.mock('@/lib/guards', () => ({
  requireApiAuth: mocks.mockRequireApiAuth,
  requireApiRole: mocks.mockRequireApiRole,
}));

vi.mock('@/lib/database', () => ({
  dbAll: mocks.mockDbAll,
  dbGet: mocks.mockDbGet,
  dbRun: mocks.mockDbRun,
  dbReady: mocks.mockDbReady,
}));

vi.mock('@/lib/polls', () => ({
  ensurePollSchema: mocks.mockEnsurePollSchema,
  parsePollId: (value: string) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  },
}));

describe('Poll core routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockDbReady.mockResolvedValue(undefined);
    mocks.mockEnsurePollSchema.mockResolvedValue(undefined);
    mocks.mockDbRun.mockResolvedValue({ changes: 1 });
  });

  it('lists student-visible active polls', async () => {
    mocks.mockRequireApiAuth.mockResolvedValue({ id: 501, role: 'student', class_id: 88 });
    mocks.mockDbAll.mockResolvedValue([
      { id: 7, title: 'Khao sat hoc ky', has_voted: 0, status: 'active' },
    ]);

    const route = await import('../src/app/api/polls/route');
    const response = await route.GET({} as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.polls).toHaveLength(1);
    expect(mocks.mockDbAll).toHaveBeenCalledWith(
      expect.stringContaining('WHERE p.status = \'active\''),
      [501, 88, 501]
    );
  });

  it('blocks teacher create poll when class is out of scope', async () => {
    mocks.mockRequireApiRole.mockResolvedValue({ id: 12, role: 'teacher' });
    mocks.mockDbGet.mockResolvedValue(null); // class access check fail

    const route = await import('../src/app/api/polls/route');
    const response = await route.POST({
      json: async () => ({
        title: 'Khao sat',
        class_id: 999,
        options: ['A', 'B'],
      }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe('FORBIDDEN');
  });

  it('blocks student from viewing poll outside class scope', async () => {
    mocks.mockRequireApiAuth.mockResolvedValue({ id: 501, role: 'student', class_id: 88 });
    mocks.mockDbGet
      .mockResolvedValueOnce({ id: 7, created_by: 12, class_id: 99 }) // poll
      .mockResolvedValueOnce(null); // membership

    const route = await import('../src/app/api/polls/[id]/route');
    const response = await route.GET({} as any, { params: Promise.resolve({ id: '7' }) });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe('FORBIDDEN');
  });

  it('rejects multi-select vote when poll disallows multiple answers', async () => {
    mocks.mockRequireApiAuth.mockResolvedValue({ id: 501, role: 'student', class_id: 88 });
    mocks.mockDbGet.mockResolvedValue({ id: 7, status: 'active', allow_multiple: 0, class_id: 88 });

    const route = await import('../src/app/api/polls/[id]/route');
    const response = await route.POST(
      {
        json: async () => ({
          option_ids: [1, 2],
        }),
      } as any,
      { params: Promise.resolve({ id: '7' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('stores vote for valid poll options', async () => {
    mocks.mockRequireApiAuth.mockResolvedValue({ id: 501, role: 'student', class_id: 88 });
    mocks.mockDbGet
      .mockResolvedValueOnce({ id: 7, status: 'active', allow_multiple: 1, class_id: 88 }) // poll
      .mockResolvedValueOnce(null); // existing vote
    mocks.mockDbAll.mockResolvedValue([{ id: 1 }, { id: 2 }]); // valid options
    mocks.mockDbRun.mockResolvedValue({ changes: 1 });

    const route = await import('../src/app/api/polls/[id]/route');
    const response = await route.POST(
      {
        json: async () => ({
          option_ids: [1, 2],
          response_text: 'Nhan xet',
        }),
      } as any,
      { params: Promise.resolve({ id: '7' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mocks.mockDbRun).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO poll_responses'),
      [7, 1, 501, 'Nhan xet', expect.any(String)]
    );
    expect(mocks.mockDbRun).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO poll_responses'),
      [7, 2, 501, 'Nhan xet', expect.any(String)]
    );
  });
});
