import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockRequireApiRole: vi.fn(),
  mockDbAll: vi.fn(),
  mockDbGet: vi.fn(),
  mockDbRun: vi.fn(),
  mockDbReady: vi.fn(),
  mockEnsurePollSchema: vi.fn(),
}));

vi.mock('@/lib/guards', () => ({
  requireApiRole: mocks.mockRequireApiRole,
}));

vi.mock('@/lib/database', () => ({
  dbAll: mocks.mockDbAll,
  dbGet: mocks.mockDbGet,
  dbRun: mocks.mockDbRun,
  dbReady: mocks.mockDbReady,
}));

vi.mock('@/lib/polls', () => ({
  ensurePollSchema: mocks.mockEnsurePollSchema,
  parsePollId: (value: string) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  },
  parseTemplateOptions: (raw: unknown) => {
    if (Array.isArray(raw)) return raw.map((item) => String(item || '').trim()).filter(Boolean);
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item || '').trim()).filter(Boolean);
        }
      } catch {}
    }
    return [];
  },
}));

describe('Teacher poll management routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockDbReady.mockResolvedValue(undefined);
    mocks.mockEnsurePollSchema.mockResolvedValue(undefined);
    mocks.mockDbRun.mockResolvedValue({ changes: 1 });
  });

  it('lists teacher-owned polls', async () => {
    mocks.mockRequireApiRole.mockResolvedValue({ id: 12, role: 'teacher' });
    mocks.mockDbAll.mockResolvedValue([
      { id: 7, title: 'Khao sat hoc ky', response_count: 3, class_name: 'CNTT K18A' },
    ]);

    const route = await import('../src/app/api/teacher/polls/route');
    const response = await route.GET({} as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.polls).toHaveLength(1);
    expect(mocks.mockDbAll).toHaveBeenCalledWith(expect.stringContaining('WHERE p.created_by = ?'), [12]);
  });

  it('creates poll with options for teacher in allowed class', async () => {
    mocks.mockRequireApiRole.mockResolvedValue({ id: 12, role: 'teacher' });
    mocks.mockDbGet
      .mockResolvedValueOnce({ id: 50 }) // class access check
      .mockResolvedValueOnce({ id: 99, title: 'Khao sat nhanh' }); // load created poll
    mocks.mockDbRun
      .mockResolvedValueOnce({ lastID: 99 })
      .mockResolvedValueOnce({ changes: 1 })
      .mockResolvedValueOnce({ changes: 1 });

    const route = await import('../src/app/api/teacher/polls/route');
    const response = await route.POST({
      json: async () => ({
        title: 'Khao sat nhanh',
        description: 'Mo ta',
        class_id: 50,
        allow_multiple: true,
        options: ['Co', 'Khong'],
      }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.poll_id).toBe(99);
    expect(mocks.mockDbRun).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO polls'),
      expect.arrayContaining(['Khao sat nhanh', 'Mo ta', 12, 50, 1])
    );
    expect(mocks.mockDbRun).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO poll_options'),
      [99, 'Co', 0]
    );
    expect(mocks.mockDbRun).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO poll_options'),
      [99, 'Khong', 1]
    );
  });

  it('rejects poll creation when teacher has no access to class', async () => {
    mocks.mockRequireApiRole.mockResolvedValue({ id: 12, role: 'teacher' });
    mocks.mockDbGet.mockResolvedValue(null);

    const route = await import('../src/app/api/teacher/polls/route');
    const response = await route.POST({
      json: async () => ({
        title: 'Khao sat',
        class_id: 999,
        options: ['Co', 'Khong'],
      }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe('FORBIDDEN');
  });

  it('closes poll for owner teacher', async () => {
    mocks.mockRequireApiRole.mockResolvedValue({ id: 12, role: 'teacher' });
    mocks.mockDbGet.mockResolvedValue({ id: 7, created_by: 12 });

    const route = await import('../src/app/api/teacher/polls/[id]/route');
    const response = await route.DELETE(
      { url: 'http://localhost/api/teacher/polls/7?action=close' } as any,
      { params: Promise.resolve({ id: '7' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mocks.mockDbRun).toHaveBeenCalledWith(expect.stringContaining("SET status = 'closed'"), [
      expect.any(String),
      7,
    ]);
  });

  it('blocks delete poll when teacher is not owner', async () => {
    mocks.mockRequireApiRole.mockResolvedValue({ id: 12, role: 'teacher' });
    mocks.mockDbGet.mockResolvedValue({ id: 7, created_by: 99 });

    const route = await import('../src/app/api/teacher/polls/[id]/route');
    const response = await route.DELETE(
      { url: 'http://localhost/api/teacher/polls/7' } as any,
      { params: Promise.resolve({ id: '7' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe('FORBIDDEN');
  });

  it('lists and creates templates, and deletes template by owner', async () => {
    mocks.mockRequireApiRole.mockResolvedValue({ id: 12, role: 'teacher' });
    mocks.mockDbAll
      .mockResolvedValueOnce([
        {
          id: 11,
          name: 'Danh gia',
          category: 'assessment',
          poll_type: 'single_choice',
          default_options: '["Tot","Binh thuong"]',
          description: '',
          created_at: '2026-04-24T10:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 55,
          name: 'Mau moi',
          category: 'general',
          poll_type: 'multiple_choice',
          default_options: '["A","B"]',
          description: 'Mau',
          created_at: '2026-04-24T11:00:00.000Z',
        },
      ]);
    mocks.mockDbRun
      .mockResolvedValueOnce({ lastID: 55 }) // create template
      .mockResolvedValueOnce({ changes: 1 }); // delete template

    const templatesRoute = await import('../src/app/api/teacher/polls/templates/route');
    const deleteTemplateRoute = await import('../src/app/api/teacher/polls/templates/[id]/route');

    const listResponse = await templatesRoute.GET({} as any);
    const listBody = await listResponse.json();
    expect(listResponse.status).toBe(200);
    expect(listBody.data.templates[0].default_options).toEqual(['Tot', 'Binh thuong']);

    const createResponse = await templatesRoute.POST({
      json: async () => ({
        name: 'Mau moi',
        category: 'general',
        poll_type: 'multiple_choice',
        description: 'Mau',
        default_options: ['A', 'B'],
      }),
    } as any);
    const createBody = await createResponse.json();
    expect(createResponse.status).toBe(201);
    expect(createBody.data.template).toMatchObject({
      id: 55,
      name: 'Mau moi',
      default_options: ['A', 'B'],
    });

    const deleteResponse = await deleteTemplateRoute.DELETE({} as any, {
      params: Promise.resolve({ id: '55' }),
    });
    const deleteBody = await deleteResponse.json();
    expect(deleteResponse.status).toBe(200);
    expect(deleteBody.success).toBe(true);
    expect(mocks.mockDbRun).toHaveBeenCalledWith(
      'DELETE FROM poll_templates WHERE id = ? AND created_by = ?',
      [55, 12]
    );
  });
});
