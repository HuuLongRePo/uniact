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

  it('returns class schedule conflicts when selected classes overlap an existing published activity', async () => {
    const dbAll = vi.fn(async (sql: string) => {
      if (sql.includes('INNER JOIN activity_classes')) {
        return [
          {
            activity_id: 99,
            title: 'Overlap Activity',
            date_time: '2026-04-20T08:30:00.000Z',
            end_time: '2026-04-20T10:00:00.000Z',
            location: 'Hall B',
            teacher_name: 'Teacher B',
            class_id: 3,
            class_name: 'CNTT K18A',
            overlap_minutes: 60,
          },
        ];
      }

      return [];
    });

    vi.doMock('@/lib/database', () => ({
      dbAll,
    }));

    vi.doMock('@/lib/guards', () => ({
      requireAuth: async () => ({ id: 77, role: 'teacher', name: 'Teacher A' }),
    }));

    const route = await import('../src/app/api/activities/check-conflicts/route');
    const req = {
      json: async () => ({
        date_time: '2026-04-20T08:00:00.000Z',
        class_ids: [3],
        mandatory_class_ids: [3],
        voluntary_class_ids: [],
        applies_to_all_students: false,
      }),
    } as any;

    const res: any = await route.POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    const conflicts = body.class_schedule_conflicts || body.data?.class_schedule_conflicts || [];
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      activity_id: 99,
      class_id: 3,
      class_name: 'CNTT K18A',
    });
  });
});
