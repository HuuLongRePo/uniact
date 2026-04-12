import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('activity check-conflicts route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('queries only canonical published activities, not legacy pending status', async () => {
    const dbAll = vi.fn(async () => []);

    vi.doMock('@/lib/database', () => ({
      dbAll,
    }));

    vi.doMock('@/lib/guards', () => ({
      requireAuth: async () => ({ id: 77, role: 'teacher', name: 'Teacher A' }),
    }));

    const route = await import('../src/app/api/activities/check-conflicts/route');
    const req = {
      json: async () => ({
        location: 'Hall A',
        date_time: '2026-04-20T08:00:00.000Z',
        duration: 120,
      }),
    } as any;

    const res: any = await route.POST(req);
    expect(res.status).toBe(200);

    expect(dbAll).toHaveBeenCalledTimes(2);

    const firstQuery = String(dbAll.mock.calls[0][0]);
    const secondQuery = String(dbAll.mock.calls[1][0]);

    expect(firstQuery).toContain("a.status = 'published'");
    expect(firstQuery).not.toContain("'pending'");
    expect(secondQuery).toContain("a.status = 'published'");
    expect(secondQuery).not.toContain("'pending'");
  });
});
