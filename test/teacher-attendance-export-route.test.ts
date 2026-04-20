import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDbAll = vi.fn();
const mockDbGet = vi.fn();
const mockDbReady = vi.fn();
const mockRequireRole = vi.fn();
const createWorkbookFromJsonSheets = vi.fn(async () => new Uint8Array([1, 2, 3]));

vi.mock('@/lib/database', () => ({
  dbAll: (...args: any[]) => mockDbAll(...args),
  dbGet: (...args: any[]) => mockDbGet(...args),
  dbReady: (...args: any[]) => mockDbReady(...args),
}));

vi.mock('@/lib/guards', () => ({
  requireRole: (...args: any[]) => mockRequireRole(...args),
}));

vi.mock('@/lib/excel-export', () => ({
  createWorkbookFromJsonSheets: (...args: any[]) => createWorkbookFromJsonSheets(...args),
  createWorkbookFromSheets: vi.fn(async () => new Uint8Array([4, 5, 6])),
}));

vi.mock('@/lib/calculations', () => ({
  calculateAttendanceRate: vi.fn(() => 0),
}));

vi.mock('@/lib/formatters', () => ({
  formatAttendanceStatus: vi.fn(() => 'present'),
}));

describe('POST /api/teacher/reports/attendance/export', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDbAll.mockReset();
    mockDbGet.mockReset();
    mockDbReady.mockReset();
    mockRequireRole.mockReset();
    createWorkbookFromJsonSheets.mockClear();

    mockDbReady.mockResolvedValue(undefined);
    mockRequireRole.mockResolvedValue({ id: 12, role: 'teacher' });
    mockDbAll.mockResolvedValueOnce([{ id: 1 }]);
    mockDbAll.mockResolvedValueOnce([]);
    mockDbAll.mockResolvedValueOnce([]);
    mockDbAll.mockResolvedValueOnce([]);
  });

  it('applies canonical face method and class filters to export records query', async () => {
    const route = await import('../src/app/api/teacher/reports/attendance/export/route');

    const response = await route.POST({
      json: async () => ({
        viewMode: 'details',
        filters: {
          classId: 'CNTT K18A',
          method: 'face',
          status: 'attended',
          dateStart: '2026-04-01',
          dateEnd: '2026-04-30',
        },
      }),
    } as any);

    expect(response.status).toBe(200);
    const [query, params] = mockDbAll.mock.calls[1] as [string, Array<string | number>];

    expect(query).toContain('c.name = ?');
    expect(query).toContain('p.attendance_status = ?');
    expect(query).toContain('lower(ar_filter.method) = ?');
    expect(query).toContain('date(a.date_time) >= date(?)');
    expect(query).toContain('date(a.date_time) <= date(?)');
    expect(params).toEqual([1, 'CNTT K18A', 'attended', 'face', '2026-04-01', '2026-04-30']);
  });
});
