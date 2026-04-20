import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  dbReady: vi.fn(async () => undefined),
  getUserFromRequest: vi.fn(),
  getAwardSuggestions: vi.fn(),
  approveAwardSuggestion: vi.fn(),
  rejectAwardSuggestion: vi.fn(),
  dbRun: vi.fn(async () => ({ changes: 1 })),
  dbAll: vi.fn(),
  dbGet: vi.fn(),
  sendDatabaseNotification: vi.fn(async () => undefined),
}));

vi.mock('@/lib/guards', () => ({
  getUserFromRequest: mocks.getUserFromRequest,
}));

vi.mock('@/lib/database', () => ({
  dbReady: mocks.dbReady,
  dbRun: mocks.dbRun,
  dbAll: mocks.dbAll,
  dbGet: mocks.dbGet,
  dbHelpers: {
    getAwardSuggestions: mocks.getAwardSuggestions,
    approveAwardSuggestion: mocks.approveAwardSuggestion,
    rejectAwardSuggestion: mocks.rejectAwardSuggestion,
    generateAwardSuggestions: vi.fn(),
  },
}));

vi.mock('@/lib/notifications', () => ({
  sendDatabaseNotification: mocks.sendDatabaseNotification,
}));

vi.mock('@/lib/scoring', () => ({
  PointCalculationService: class PointCalculationService {},
}));

describe('award and alert notification canonicalization', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.getUserFromRequest.mockResolvedValue({ id: 1, role: 'admin' });
  });

  it('admin awards approve route uses notification helper', async () => {
    mocks.approveAwardSuggestion.mockResolvedValue(undefined);
    mocks.getAwardSuggestions.mockResolvedValue([
      { id: 7, student_id: 101, award_type_name: 'Sinh viên xuất sắc' },
    ]);

    const route = await import('../src/app/api/admin/awards/route');
    const response = await route.PUT({
      json: async () => ({ suggestion_id: 7, action: 'approve', note: 'ok' }),
    } as any);

    expect(response.status).toBe(200);
    expect(mocks.sendDatabaseNotification).toHaveBeenCalledWith({
      userId: 101,
      type: 'award',
      title: 'Chúc mừng! Bạn được khen thưởng',
      message: 'Bạn đã được duyệt khen thưởng: Sinh viên xuất sắc',
      relatedTable: 'award_suggestions',
      relatedId: 7,
    });
  });

  it('generate-alerts route uses notification helper for score alerts', async () => {
    mocks.dbAll.mockResolvedValue([{ id: 42, name: 'Student A', email: 'sv@test' }]);
    mocks.dbGet.mockImplementation(async (sql: string) => {
      if (sql.includes('warning_green_min')) return { config_value: '80' };
      if (sql.includes('warning_yellow_min')) return { config_value: '60' };
      if (sql.includes('warning_orange_min')) return { config_value: '40' };
      if (sql.includes('SUM(points)')) return { total: 20 };
      return null;
    });

    const route = await import('../src/app/api/jobs/generate-alerts/route');
    const response = await route.POST({} as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mocks.sendDatabaseNotification).toHaveBeenCalledWith({
      userId: 42,
      type: 'score_alert',
      title: 'Cảnh báo RED',
      message: expect.stringContaining('Cảnh báo ĐỎ'),
      relatedTable: 'users',
      relatedId: 42,
    });
  });
});
