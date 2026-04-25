import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  dbReady: vi.fn(),
  dbAll: vi.fn(),
  dbGet: vi.fn(),
  requireRole: vi.fn(),
  createSimplePdf: vi.fn(),
  calculateAttendanceRate: vi.fn(),
  formatDate: vi.fn(),
}));

vi.mock('@/lib/database', () => ({
  dbReady: mocks.dbReady,
  dbAll: mocks.dbAll,
  dbGet: mocks.dbGet,
}));

vi.mock('@/lib/guards', () => ({
  requireRole: mocks.requireRole,
}));

vi.mock('@/lib/reports/simple-pdf', () => ({
  createSimplePdf: mocks.createSimplePdf,
}));

vi.mock('@/lib/calculations', () => ({
  calculateAttendanceRate: mocks.calculateAttendanceRate,
}));

vi.mock('@/lib/formatters', () => ({
  formatDate: mocks.formatDate,
}));

describe('POST /api/teacher/reports/class-stats/export', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.dbReady.mockResolvedValue(undefined);
    mocks.requireRole.mockResolvedValue({ id: 10, role: 'teacher' });
    mocks.dbAll.mockResolvedValue([{ class_name: 'CTK42', total_students: 40 }]);
    mocks.createSimplePdf.mockReturnValue(Buffer.from('pdf-bytes'));
    mocks.calculateAttendanceRate.mockReturnValue(0);
    mocks.formatDate.mockReturnValue('2026-04-25 17:00');
  });

  it('returns pdf export with utf-8 content-disposition header', async () => {
    const route = await import('../src/app/api/teacher/reports/class-stats/export/route');
    const response = await route.POST(
      {
        json: async () => ({}),
      } as any
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/pdf');
    expect(response.headers.get('Content-Disposition')).toMatch(
      /^attachment; filename="class-stats-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.pdf"; filename\*=UTF-8''class-stats-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.pdf$/
    );
  });
});
