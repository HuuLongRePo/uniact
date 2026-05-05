import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requireApiRoleMock,
  getAwardSuggestionsMock,
  createAwardSuggestionMock,
  dbGetMock,
  dbRunMock,
} = vi.hoisted(() => ({
  requireApiRoleMock: vi.fn(),
  getAwardSuggestionsMock: vi.fn(),
  createAwardSuggestionMock: vi.fn(),
  dbGetMock: vi.fn(),
  dbRunMock: vi.fn(),
}));

vi.mock('@/lib/guards', () => ({
  requireApiRole: requireApiRoleMock,
}));

vi.mock('@/lib/database', () => ({
  dbHelpers: {
    getAwardSuggestions: getAwardSuggestionsMock,
    createAwardSuggestion: createAwardSuggestionMock,
  },
  dbGet: dbGetMock,
  dbRun: dbRunMock,
}));

describe('teacher award suggestion routes', () => {
  beforeEach(() => {
    vi.resetModules();
    requireApiRoleMock.mockReset();
    getAwardSuggestionsMock.mockReset();
    createAwardSuggestionMock.mockReset();
    dbGetMock.mockReset();
    dbRunMock.mockReset();
    requireApiRoleMock.mockResolvedValue({ id: 7, role: 'teacher' });
  });

  it('filters suggestions to the current teacher on GET', async () => {
    getAwardSuggestionsMock.mockResolvedValue([
      { id: 11, student_id: 1, award_type_id: 3, award_type_name: 'Xuat sac', suggestion_by: 7, status: 'pending', suggested_at: '2026-05-01', score_snapshot: 88 },
      { id: 12, student_id: 2, award_type_id: 4, award_type_name: 'Tot', suggestion_by: 9, status: 'pending', suggested_at: '2026-05-01', score_snapshot: 75 },
    ]);

    const route = await import('../src/app/api/teacher/award-suggestions/route');
    const request = {
      nextUrl: new URL('http://localhost/api/teacher/award-suggestions?status=pending'),
    } as any;
    const response = await route.GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getAwardSuggestionsMock).toHaveBeenCalledWith('pending');
    expect(body.data.suggestions).toHaveLength(1);
    expect(body.data.suggestions[0]).toMatchObject({ id: 11, suggestion_by: 7 });
  });

  it('creates a suggestion for the current teacher on POST', async () => {
    createAwardSuggestionMock.mockResolvedValue({ lastID: 99 });

    const route = await import('../src/app/api/teacher/award-suggestions/route');
    const response = await route.POST(
      new Request('http://localhost/api/teacher/award-suggestions', {
        method: 'POST',
        body: JSON.stringify({ student_id: 3, award_type_id: 5 }),
        headers: { 'Content-Type': 'application/json' },
      }) as any
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(createAwardSuggestionMock).toHaveBeenCalledWith(3, 5, 7);
    expect(body.message).toBe('Tao de xuat khen thuong thanh cong');
  });

  it('deletes only pending suggestions owned by the current teacher', async () => {
    dbGetMock.mockResolvedValue({ id: 11, status: 'pending', suggestion_by: 7 });

    const route = await import('../src/app/api/teacher/award-suggestions/[id]/route');
    const response = await route.DELETE(
      new Request('http://localhost/api/teacher/award-suggestions/11', {
        method: 'DELETE',
      }) as any,
      { params: Promise.resolve({ id: '11' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(dbRunMock).toHaveBeenCalledWith('DELETE FROM award_suggestions WHERE id = ?', [11]);
    expect(body.message).toBe('Xoa de xuat khen thuong thanh cong');
  });
});
