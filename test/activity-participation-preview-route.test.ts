import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockRequireApiRole: vi.fn(),
  mockDbAll: vi.fn(),
}));

vi.mock('@/lib/guards', () => ({
  requireApiRole: mocks.mockRequireApiRole,
}));

vi.mock('@/lib/database', () => ({
  dbAll: mocks.mockDbAll,
  ensureActivityClassParticipationMode: vi.fn(async () => undefined),
  ensureActivityStudentScope: vi.fn(async () => undefined),
}));

import * as route from '../src/app/api/activities/participation-preview/route';

describe('POST /api/activities/participation-preview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('groups mandatory preview by class for teacher scope', async () => {
    mocks.mockRequireApiRole.mockResolvedValue({ id: 9, role: 'teacher' });
    mocks.mockDbAll.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM classes c')) {
        return [{ id: 1, name: 'CNTT K18A' }];
      }

      if (sql.includes('FROM users u')) {
        return [
          { id: 100, name: 'Student A', email: 'a@example.com', class_id: 1 },
          { id: 101, name: 'Student B', email: 'b@example.com', class_id: 1 },
        ];
      }

      return [];
    });

    const res = await route.POST({
      json: async () => ({ class_ids: [1] }),
    } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.preview).toMatchObject({
      total_classes: 1,
      mandatory_participants: 2,
      voluntary_participants: 0,
      conflict_count: 0,
    });
    expect(body.preview.groups[0]).toMatchObject({
      class_id: 1,
      class_name: 'CNTT K18A',
      mandatory_count: 2,
    });
    expect(body.preview.groups[0].students).toHaveLength(2);
  });

  it('returns direct student preview alongside class preview when student scope is provided', async () => {
    mocks.mockRequireApiRole.mockResolvedValue({ id: 9, role: 'teacher' });
    mocks.mockDbAll.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM classes c')) {
        return [{ id: 1, name: 'CNTT K18A' }];
      }

      if (sql.includes('u.class_id IN')) {
        return [{ id: 100, name: 'Student A', email: 'a@example.com', class_id: 1 }];
      }

      if (sql.includes('u.id IN')) {
        return [{ id: 201, name: 'Student Direct', email: 'direct@example.com', class_id: 2 }];
      }

      return [];
    });

    const res = await route.POST({
      json: async () => ({
        mandatory_class_ids: [1],
        voluntary_student_ids: [201],
      }),
    } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.preview.groups).toHaveLength(1);
    expect(body.preview.direct_students).toEqual([
      expect.objectContaining({
        id: 201,
        participation_mode: 'voluntary',
        source: 'direct_student_scope',
      }),
    ]);
  });

  it('maps legacy is_mandatory=false to voluntary class preview', async () => {
    mocks.mockRequireApiRole.mockResolvedValue({ id: 9, role: 'teacher' });
    mocks.mockDbAll.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM classes c')) {
        return [{ id: 2, name: 'CNTT K18B' }];
      }

      if (sql.includes('u.class_id IN')) {
        return [
          { id: 301, name: 'Student Legacy', email: 'legacy@example.com', class_id: 2 },
        ];
      }

      return [];
    });

    const res = await route.POST({
      json: async () => ({
        class_ids: [2],
        is_mandatory: false,
      }),
    } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.preview.groups[0]).toMatchObject({
      class_id: 2,
      participation_mode: 'voluntary',
      mandatory_count: 0,
      voluntary_count: 1,
    });
  });
});
