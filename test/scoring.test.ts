import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/database', () => ({
  dbHelpers: {
    getUsersByClass: async () => [],
  },
  dbAll: async (sql: string, bindings?: any[]) => {
    if (sql.includes('FROM users u')) {
      const classId = bindings?.[0];
      const rows = [
        { id: 1, name: 'Student A', email: 'a@example.com', class_id: 1, class_name: 'CTK43' },
        { id: 2, name: 'Student B', email: 'b@example.com', class_id: 1, class_name: 'CTK43' },
        { id: 3, name: 'Student C', email: 'c@example.com', class_id: 2, class_name: 'CTK44' },
      ];

      return typeof classId === 'number' ? rows.filter((row) => row.class_id === classId) : rows;
    }

    if (sql.includes('FROM participations p')) {
      return [
        { student_id: 1, activities_count: 2 },
        { student_id: 2, activities_count: 3 },
        { student_id: 3, activities_count: 1 },
      ];
    }

    return [];
  },
}));

vi.mock('@/lib/guards', () => ({
  getUserFromRequest: async () => ({ id: 1, role: 'admin' }),
}));

vi.mock('@/lib/score-ledger', () => ({
  getFinalScoreLedgerByStudentIds: async () =>
    new Map([
      [
        1,
        {
          student_id: 1,
          participation_points: 50,
          award_points: 0,
          adjustment_points: 0,
          final_total: 50,
        },
      ],
      [
        2,
        {
          student_id: 2,
          participation_points: 75,
          award_points: 0,
          adjustment_points: 0,
          final_total: 75,
        },
      ],
      [
        3,
        {
          student_id: 3,
          participation_points: 30,
          award_points: 0,
          adjustment_points: 0,
          final_total: 30,
        },
      ],
    ]),
}));

import * as scoreboardRoute from '../src/app/api/scoreboard/route';

function makeGetReq(qs = '') {
  return {
    nextUrl: new URL('http://localhost/' + qs),
    cookies: { get: (_: string) => ({ value: 'dummy' }) },
  } as any;
}

describe('Scoreboard API (unit)', () => {
  it('GET returns scoreboard with students sorted by score', async () => {
    const res: any = await (scoreboardRoute as any).GET(makeGetReq('?page=1&per_page=20'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('students');
    expect(body).toHaveProperty('meta');
    expect(Array.isArray(body.students)).toBe(true);
    expect(body.meta).toHaveProperty('total');
    expect(body.meta).toHaveProperty('page');
    expect(body.students.map((student: any) => student.id)).toEqual([2, 1, 3]);
  });

  it('GET supports pagination', async () => {
    const res: any = await (scoreboardRoute as any).GET(makeGetReq('?page=2&per_page=2'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.meta.page).toBe(2);
    expect(body.students.map((student: any) => student.id)).toEqual([3]);
  });

  it('GET supports class_id filter', async () => {
    const res: any = await (scoreboardRoute as any).GET(makeGetReq('?class_id=1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.students).toHaveLength(2);
  });

  it('GET supports sorting by name', async () => {
    const res: any = await (scoreboardRoute as any).GET(makeGetReq('?sort_by=name&order=asc'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.students.map((student: any) => student.name)).toEqual([
      'Student A',
      'Student B',
      'Student C',
    ]);
  });
});
