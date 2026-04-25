import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockRequireApiRole: vi.fn(),
  mockDbAll: vi.fn(),
  mockDbGet: vi.fn(),
  mockDbRun: vi.fn(),
  mockDbReady: vi.fn(),
  mockEnsurePollSchema: vi.fn(),
}));

vi.mock('@/lib/guards', () => ({
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
  parseTemplateOptions: (raw: unknown) => {
    if (Array.isArray(raw)) return raw.map((item) => String(item || '')).filter(Boolean);
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item || '')).filter(Boolean);
        }
      } catch {}
    }
    return [];
  },
}));

describe('Teacher poll settings route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockRequireApiRole.mockResolvedValue({ id: 33, role: 'teacher' });
    mocks.mockDbReady.mockResolvedValue(undefined);
    mocks.mockEnsurePollSchema.mockResolvedValue(undefined);
    mocks.mockDbRun.mockResolvedValue({ changes: 1 });
  });

  it('returns default settings when no row exists', async () => {
    mocks.mockDbGet.mockResolvedValue(undefined);
    mocks.mockDbAll.mockResolvedValue([]);

    const route = await import('../src/app/api/teacher/polls/settings/route');
    const response = await route.GET({} as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.settings).toMatchObject({
      default_duration_minutes: 60,
      allow_multiple_answers: false,
      show_results_before_closing: true,
      allow_anonymous_responses: false,
      default_visibility: 'class',
      templates: [],
    });
  });

  it('upserts settings and returns parsed templates', async () => {
    mocks.mockDbGet.mockResolvedValue({
      id: 9,
      default_duration_minutes: 45,
      allow_multiple_answers: 1,
      show_results_before_closing: 0,
      allow_anonymous_responses: 1,
      default_visibility: 'student',
    });
    mocks.mockDbAll.mockResolvedValue([
      {
        id: 101,
        name: 'Danh gia buoi hoc',
        category: 'assessment',
        poll_type: 'single_choice',
        default_options: '["Tot","Can cai thien"]',
        description: 'Mau nhanh',
        created_at: '2026-04-24T10:00:00.000Z',
      },
    ]);

    const route = await import('../src/app/api/teacher/polls/settings/route');
    const response = await route.POST({
      json: async () => ({
        default_duration_minutes: 45,
        allow_multiple_answers: true,
        show_results_before_closing: false,
        allow_anonymous_responses: true,
        default_visibility: 'student',
      }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.settings).toMatchObject({
      default_duration_minutes: 45,
      allow_multiple_answers: true,
      show_results_before_closing: false,
      allow_anonymous_responses: true,
      default_visibility: 'student',
    });
    expect(body.data.settings.templates[0]).toMatchObject({
      name: 'Danh gia buoi hoc',
      default_options: ['Tot', 'Can cai thien'],
    });
    expect(mocks.mockDbRun).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT(user_id) DO UPDATE'),
      expect.arrayContaining([33, 45, 1, 0, 1, 'student'])
    );
  });
});
