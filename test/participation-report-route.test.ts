import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockGetUserFromToken: vi.fn(),
  mockDbAll: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getUserFromToken: mocks.mockGetUserFromToken,
}));

vi.mock('@/lib/database', () => ({
  dbAll: mocks.mockDbAll,
}));

import * as participationRoute from '../src/app/api/reports/participation/route';

function makeRequest(url: string, token?: string) {
  const nextUrl = new URL(url, 'http://localhost');

  return {
    nextUrl,
    cookies: {
      get: (key: string) => {
        if (key === 'token' && token) {
          return { value: token };
        }

        return undefined;
      },
    },
  } as unknown as Parameters<typeof participationRoute.GET>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Participation report route', () => {
  it('rejects requests without token', async () => {
    const response = await participationRoute.GET(
      makeRequest('http://localhost/api/reports/participation')
    );

    expect(response.status).toBe(401);

    const body = await response.json();

    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('rejects non-admin users', async () => {
    mocks.mockGetUserFromToken.mockResolvedValue({ id: 2, role: 'teacher' });

    const response = await participationRoute.GET(
      makeRequest('http://localhost/api/reports/participation', 'token-1')
    );

    expect(response.status).toBe(403);

    const body = await response.json();

    expect(body.success).toBe(false);
    expect(body.code).toBe('FORBIDDEN');
  });

  it('returns activities in both nested and top-level contract', async () => {
    mocks.mockGetUserFromToken.mockResolvedValue({ id: 1, role: 'admin' });
    mocks.mockDbAll.mockResolvedValue([
      {
        id: 21,
        title: 'Activity A',
        date_time: '2026-04-07T08:00:00.000Z',
        location: 'Hall A',
        participant_count: 10,
        attended_count: 7,
      },
    ]);

    const response = await participationRoute.GET(
      makeRequest(
        'http://localhost/api/reports/participation?start=2026-04-01&end=2026-04-30&class_id=3&activity_type_id=2',
        'token-1'
      )
    );

    expect(response.status).toBe(200);

    const body = await response.json();
    const [query, bindings] = mocks.mockDbAll.mock.calls[0] as [string, Array<string | number>];

    expect(query).toContain('a.date_time >= ?');
    expect(query).toContain('a.date_time <= ?');
    expect(query).toContain('activity_classes');
    expect(query).toContain('a.activity_type_id = ?');
    expect(bindings).toEqual(['2026-04-01', '2026-04-30 23:59:59', '3', '2']);
    expect(body.success).toBe(true);
    expect(body.activities).toEqual(body.data.activities);
    expect(body.activities[0]).toMatchObject({
      id: 21,
      title: 'Activity A',
      participant_count: 10,
      attended_count: 7,
    });
  });

  it('exports CSV with BOM for admin users', async () => {
    mocks.mockGetUserFromToken.mockResolvedValue({ id: 1, role: 'admin' });
    mocks.mockDbAll.mockResolvedValue([
      {
        id: 21,
        title: 'Activity "A"',
        date_time: '2026-04-07T08:00:00.000Z',
        location: 'Hall, A',
        participant_count: 10,
        attended_count: 7,
      },
    ]);

    const response = await participationRoute.GET(
      makeRequest('http://localhost/api/reports/participation?export=csv', 'token-1')
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/csv');
    expect(response.headers.get('Content-Disposition')).toMatch(
      /^attachment; filename="participation-report-\d{4}-\d{2}-\d{2}\.csv"; filename\*=UTF-8''participation-report-\d{4}-\d{2}-\d{2}\.csv$/
    );

    const bytes = new Uint8Array(await response.arrayBuffer());
    const csv = new TextDecoder('utf-8').decode(bytes);

    expect(Array.from(bytes.slice(0, 3))).toEqual([239, 187, 191]);
    expect(csv).toContain('"Activity ""A"""');
    expect(csv).toContain('"Hall, A"');
  });
});
