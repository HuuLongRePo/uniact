import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockDbAll: vi.fn(),
  mockDbReady: vi.fn(),
  mockGetUserFromRequest: vi.fn(),
}));

vi.mock('@/lib/database', () => ({
  dbAll: mocks.mockDbAll,
  dbReady: mocks.mockDbReady,
}));

vi.mock('@/lib/guards', () => ({
  getUserFromRequest: mocks.mockGetUserFromRequest,
}));

import * as exportUsersRoute from '../src/app/api/export/users/route';

function makeRequest(url: string) {
  return {
    nextUrl: new URL(url, 'http://localhost'),
  } as unknown as Parameters<typeof exportUsersRoute.GET>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mockDbReady.mockResolvedValue(undefined);
});

describe('GET /api/export/users', () => {
  it('rejects non-admin users', async () => {
    mocks.mockGetUserFromRequest.mockResolvedValue({ id: 2, role: 'teacher' });

    const response = await exportUsersRoute.GET(makeRequest('http://localhost/api/export/users'));

    expect(response.status).toBe(403);
  });

  it('returns csv with quoted filename in content-disposition', async () => {
    mocks.mockGetUserFromRequest.mockResolvedValue({ id: 1, role: 'admin' });
    mocks.mockDbAll.mockResolvedValue([
      {
        id: 1,
        email: 'admin@example.com',
        username: 'admin',
        full_name: 'Admin A',
        role: 'admin',
        student_code: '',
        phone: '',
        teacher_rank: '',
        academic_title: '',
        academic_degree: '',
        teaching_class_name: '',
        gender: '',
        date_of_birth: '',
        citizen_id: '',
        province: '',
        district: '',
        ward: '',
        address_detail: '',
        class_id: null,
        created_at: '2026-04-24T08:00:00.000Z',
      },
    ]);

    const response = await exportUsersRoute.GET(makeRequest('http://localhost/api/export/users'));

    expect(response.status).toBe(200);
    expect(mocks.mockDbReady).toHaveBeenCalled();
    expect(response.headers.get('Content-Disposition')).toMatch(
      /^attachment; filename="users-export-\d{4}-\d{2}-\d{2}\.csv"; filename\*=UTF-8''users-export-\d{4}-\d{2}-\d{2}\.csv$/
    );

    const bytes = new Uint8Array(await response.arrayBuffer());
    const csv = new TextDecoder('utf-8').decode(bytes);
    expect(Array.from(bytes.slice(0, 3))).toEqual([239, 187, 191]);
    expect(csv).toContain('admin@example.com');
  });
});
